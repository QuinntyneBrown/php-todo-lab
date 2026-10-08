# 06 · The Eloquent repository: queries, transactions and locks

Video four showed the `TodoRepository` interface. This video opens `EloquentTodoRepository`, the one class in the backend that talks to the database, and reads every method against the EF Core idiom you would use instead: `IQueryable` composition, change tracking versus `ExecuteUpdate`, explicit transactions, isolation levels, and retry strategies. It also shows the tests that prove the concurrency claims, because in this repository every locking decision has a test that races it.

## What you will be able to answer

By the end you will be able to answer: how a query is composed from scopes and why the result is converted with `toBase`, why `update` issues a query-level statement instead of saving the model, how the five hundred todo cap is enforced atomically with a locking read and a retried transaction, how the bulk operations stay all-or-nothing, and how the purge deletes in chunks without long locks.

## Reading and composing queries

Open `app/Repositories/EloquentTodoRepository.php`. It is final, implements the interface, and is the only file outside tests and the model that calls `Todo::query`. Start with `list`. It builds a query ordered by `created_at` descending then `id` descending, applies a scope depending on the `TodoStatus` with `match`, then calls `get` and `toBase`. The order matches the composite index from video five, so MySQL reads the index in order and stops. `toBase` converts Eloquent's model collection into the plain support collection the interface declares; that is a deliberate narrowing so the Actions depend on the generic collection type, not on Eloquent's.

In EF Core you would compose an `IQueryable` with `Where` and `OrderByDescending` and call `ToListAsync`. The shape is the same: scopes are the reusable `Where` clauses, the query builder is the `IQueryable`, and nothing executes until `get`. There is no `async` because PHP's request model is synchronous; a query blocks the worker, and that is normal.

`counts` runs two count queries through the `active` and `completed` scopes and returns the array shape from the interface. `find` is `Todo::query()->find`, which honours the soft-delete filter, and `findDeleted` is `Todo::onlyTrashed()->find`, which inverts it. Those two methods are the whole reason the Actions can express different not-found rules.

## Updating with one statement

`update` is the method a .NET developer should read twice. The obvious implementation is to fill the model's attributes and call `save`. The repository does not do that. Read the comment: a model `save` writes only attributes that changed in memory, the same dirty tracking as EF's `SaveChanges`. If two concurrent requests each load the row, and one changes only the title while the other sets `completed_at` to the value it already holds, dirty tracking would skip the "unchanged" column and that request would write nothing for it. Requirement L2-043 says each concurrent patch must apply in full, so the repository issues a query-level `update` with `whereKey`, which writes every column it is given, in one `UPDATE` statement that InnoDB applies atomically. That is `ExecuteUpdateAsync` rather than change tracking, chosen for the same reason you would choose it in EF.

Two details. First, query-level updates bypass the model's casts, so the method runs each value through `fromDateTime` when it is a date, keeping the UTC rule from video five. Second, after the statement it calls `refresh` so the returned model reflects the row, including `updated_at`. `UpdateTodoTest` races two patches in separate PHP processes and asserts the final row equals one of them, never a mix.

## The cap: a locking read inside a retried transaction

`createWithinLimit` is the heart of the file. It wraps a closure in `DB::transaction` with `attempts` set to three. Inside, it counts non-deleted todos with `lockForUpdate`, throws `TodoLimitReached` if the count has reached the limit, otherwise creates the todo. The comment explains the mechanism, and it is worth understanding rather than trusting. At InnoDB's default isolation level, repeatable read, a plain count does not stop two transactions from both seeing four hundred ninety-nine and both inserting. `lockForUpdate` turns the count into a locking read, `SELECT ... FOR UPDATE`, which takes next-key locks on the index range it scans. A second concurrent create blocks on those locks until the first transaction commits, then counts the new row and sees five hundred. If the two transactions deadlock, InnoDB aborts one, and Laravel's `attempts` argument retries the closure, up to three attempts in total.

In EF Core you would reach for one of three things: a serializable transaction, a raw `UPDLOCK, HOLDLOCK` hint in SQL Server, or an execution strategy with retry on failure. EF has no portable lock hint, so this is a case where Eloquent's query builder is ahead: `lockForUpdate` is a method, and retry is an argument. `TodoLimitTest` proves it: it seeds four hundred ninety-nine committed rows and launches six concurrent `tinker` processes that each call the `CreateTodo` Action, then asserts exactly five hundred rows and exactly one winner. Look at how the test writes through a second connection named `committed`, because the test framework wraps the default connection in a transaction that other processes cannot see. That trick, and the cleanup in the `finally` block, is the kind of thing a reviewer should recognise rather than flag.

## Bulk operations are one transaction each

`deleteCompleted` opens a transaction, selects the ids of completed todos with `lockForUpdate`, soft-deletes them with a single `whereIn` delete, and returns the ids. `restoreMany` mirrors it: find the trashed ids among the requested ones with a locking read, restore them in one statement, then load and return the restored models. The locking read in both means a concurrent clear and restore serialise rather than interleave.

The transaction gives the all-or-nothing guarantee from requirement L2-017 and L2-043, and the tests prove it in a way worth copying. `ClearCompletedTodosTest` registers a `DB::listen` callback that throws on the first `UPDATE` statement, calls the endpoint, asserts a 500, and then asserts all three completed todos are still there. `RestoreTodosTest` does the same for restore. That is fault injection at the query log, with no mocking of the database, and it is the PHP equivalent of an interceptor that throws in `SaveChanges`.

## Purging in chunks

`purgeDeletedBefore` is the only hard delete. It takes trashed rows older than the cutoff, limits the batch, and calls `forceDelete`, which returns the number of rows removed. The chunking lives in the command, which video nine covers: it calls this method in a loop of five hundred until a batch comes back short. Each `DELETE` is small, so it never holds long locks, which is requirement L2-016 criterion four.

## The latency test as a design constraint

One more test shapes this file: `LatencyTest` seeds five hundred todos, warms the framework, and asserts every endpoint answers in under two hundred milliseconds. It runs in a separate group without coverage instrumentation, because instrumentation would distort timings. That budget is why the list query follows the index, why `TodoResource` avoids per-row date parsing as video seven shows, and why `RestoreTodosRequest` has the one-pass duplicate check. When you review a repository change here, ask whether it keeps the index order, and run that group.

## Pitfalls

Writing `$todo->fill($columns)->save()` in `update` and reintroducing the dirty-tracking gap. Counting without `lockForUpdate` inside the transaction and leaving the cap racy. Dropping the `attempts` argument and turning a deadlock into a 500. Returning an Eloquent collection from `list` where the interface says the base collection, which Larastan catches. Loading models in a loop and deleting one at a time in a bulk operation, which is both slow and non-atomic. And testing concurrency with mocks instead of racing real processes against MySQL.

## Things to remember

The repository is the only class that queries. Scopes compose queries like `IQueryable` predicates, and `toBase` narrows the result type. `update` is one statement, like `ExecuteUpdate`, so concurrent patches apply in full. The cap is a locking read inside a transaction retried three times. Bulk operations lock, change, and return inside one transaction, with fault-injection tests proving rollback. The purge deletes in small batches. And a two-hundred-millisecond latency test keeps all of it honest.

Next, the API Resources that turn models into the JSON contract, compared with DTOs and `System.Text.Json`.
