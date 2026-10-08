# 04 · Actions and the repository port

This is the layer where a MediatR user feels at home. Every use case in the backend is one class in `app/Actions/Todos`, with one public method, depending on one interface. This video reads all seven Actions, the `TodoRepository` interface they depend on, the two domain exceptions, and the binding that makes it work, and compares each piece with a request handler and an application-layer repository in a Clean Architecture solution.

## What you will be able to answer

By the end you will be able to answer: how an Action compares with a MediatR handler and what you give up by not having a mediator, where business rules live and where they deliberately do not, what the repository interface promises and why it owns the transactions, and how a new use case or a new filter is added without touching existing Actions.

## An Action is a handler without the mediator

Open `CreateTodo`. A `final readonly class`, a constructor that takes the `TodoRepository` interface, a typed constant `LIMIT` of five hundred, and a `handle` method that takes a title and returns a `Todo`. That is the whole use case. In MediatR you would write a `CreateTodoCommand` record, a `CreateTodoHandler` implementing the request handler interface, and the controller would call `Send` on the mediator. Here there is no command object and no mediator: the parameters of `handle` are the command, and the controller calls the Action directly, after the container injects it.

What you lose is the pipeline. There are no pipeline behaviours for logging, validation, or transactions wrapped around every handler. In this backend each of those has a home that is arguably more explicit: validation is the Form Request from video three, transactions live in the repository, and there is no cross-cutting logging in the request path because the design does not need it. If this project grew to need pipeline behaviours, Laravel has a `Pipeline` class and middleware, but the choice here is simplicity: one class, one method, no indirection.

What you keep is everything that matters for testing. Each Action depends on the interface, not on Eloquent, so `tests/Unit/Actions` instantiates an Action with `InMemoryTodoRepository` and never opens a database connection. Requirement L2-044 states this: a single public `handle` and a constructor dependency on the interface.

## The seven use cases

`ListTodos` takes a `TodoStatus` enum, asks the repository for counts and for the filtered list, and returns a `TodoList`. Open `TodoList`: a readonly class with three public promoted properties, the collection of todos, the active count, and the completed count. That is a C# positional record used as a query result. Note that the counts cover all non-deleted todos regardless of the filter, which is what the contract's `meta` object needs, so the Action asks for both.

`CreateTodo` you have seen. It passes the limit to `createWithinLimit`, and the repository does the atomic check and insert. The rule "at most five hundred" belongs to the Action, as a constant; the mechanism for enforcing it atomically belongs to the repository, because it needs a transaction and a locking read, and the Action must not know about either.

`UpdateTodo` is the most interesting. Read it line by line. It loads the todo or throws `TodoNotFound`. It builds a `columns` array. If the changes contain a title, it copies it. If the changes contain `completed`, it writes `completed_at` as either the existing value or now, using the null coalescing operator, or null when reopening. The comment explains two things: `completed_at` is always written when requested, so a concurrent request cannot leave this one half-applied, and the coalescing keeps an existing timestamp, which makes completing twice idempotent. That is requirement L2-009 criterion three, encoded in one line, with the requirement id in the comment. When you review PHP in this repository, that pattern, a short comment citing the L2 id next to the non-obvious line, is what you are looking for.

`DeleteTodo` and `RestoreTodo` are mirror images. Delete finds a live todo or throws, then soft-deletes it. Restore finds a deleted todo with `findDeleted` or throws, then restores it. This is why the controller passes a string id: the two Actions apply different not-found rules to the same id.

`ClearCompletedTodos` and `RestoreTodos` are the bulk pair. Clear returns the list of ids it deleted, which the client keeps so it can undo. Restore takes a list of ids and returns the restored todos as a collection, silently ignoring ids that are not deleted. Both delegate to one repository method each, because both need a transaction.

Notice what no Action does. None imports the `Todo` model's query builder. None uses a facade. None catches an exception to return null. None has a second public method. If a pull request adds any of those, the layering has been broken, and the unit tests with the fake will be the first thing to fail.

## The repository is a port that owns transactions

Open `app/Repositories/TodoRepository.php`. Eleven methods, each with a docblock that states its contract in a sentence: `list` returns non-deleted todos newest first with ties broken by id; `counts` returns an array shape of active and completed; `createWithinLimit` is atomic and throws `TodoLimitReached`; `find` returns the non-deleted todo or null; `update` writes the given columns in one statement; `delete` soft-deletes; `findDeleted` and `restore` handle the trashed side; `deleteCompleted` and `restoreMany` run in one transaction; and `purgeDeletedBefore` permanently removes up to a limit of rows older than a cutoff, for the scheduled command.

Three things to compare with an `ITodoRepository` in your Application layer. First, this interface is shaped by the use cases, not by CRUD. There is no generic `GetAll` or `Save`; there is `createWithinLimit` and `deleteCompleted`. Each method is exactly what one Action needs, which keeps the in-memory fake small and honest.

Second, transactions live behind the interface. In .NET you might put a unit of work or a transaction behaviour in the pipeline so the handler stays clean. Here the repository method itself opens the transaction, because a transaction is a persistence concern and the fake simply does not need one. Video six shows the Eloquent side.

Third, the interface returns Eloquent `Todo` models, not separate domain entities. Laravel's Eloquent is an Active Record pattern, so the model is both the entity and its mapper. This backend accepts that: the model carries no business methods beyond a computed `completed` accessor and two query scopes, and the Actions treat it as data. A DDD purist would wrap it; this project chooses the lighter path and relies on the interface to keep query logic out of the Actions. Know that it is a choice, and review against it consistently.

## Domain exceptions and the binding

`TodoNotFound` and `TodoLimitReached` live in `app/Exceptions`. Both are final, extend `RuntimeException`, and carry a public readonly property, the id or the limit, plus a message. `TodoLimitReached`'s message is the exact sentence the UI shows: "You have five hundred tasks. Finish or delete some to add more." The `ProblemDetailsRenderer` maps one to 404 and the other to 422, which video eight covers. The alternative you might reach for in C#, a `Result` type, is not idiomatic in Laravel; exceptions plus one renderer is the convention, and it keeps the Actions' signatures clean.

The binding is the one line in `AppServiceProvider` from video two: `TodoRepository` to `EloquentTodoRepository`. The unit tests replace it by construction, passing `new InMemoryTodoRepository` straight into the Action's constructor. No container, no mocking library.

## Adding a use case, adding a filter

To add a use case, you add an Action class, a repository method if the persistence contract needs one, the same method in the fake, a route, a Form Request if there is input, a controller method, and tests. Nothing existing changes except the interface, and the compiler, or rather Larastan, tells you every implementation to update.

To add a filter, the backend layering design gives the recipe: a new `TodoStatus` case, a new scope on the model, one new arm in the repository's `match`, and a test. `ListTodos` does not change, `ListTodosRequest` does not change because it validates against the enum, and the controller does not change. That is the open/closed principle as a checklist, and it is requirement L2-044 criterion six.

## Pitfalls

Injecting the `Todo` model or a query builder into an Action instead of the interface. Adding a second public method to an Action because two endpoints felt related. Returning a loose array from an Action where a readonly result class like `TodoList` should be. Catching `TodoNotFound` inside an Action to return null, which hides the 404 from the renderer. And wrapping an Action body in `DB::transaction`, which couples it to the database and breaks the in-memory tests; put the transaction in the repository method instead.

## Things to remember

An Action is a MediatR handler without the mediator: one class, one `handle`, one interface dependency, and the parameters are the command. Business rules such as the idempotent completion live in Actions; atomic persistence mechanics live in the repository. The repository interface is shaped by use cases, owns its transactions, and returns Eloquent models by choice. Domain exceptions carry data and are mapped once, in the renderer. New use cases and new filters add code without modifying existing Actions.

Next, the `Todo` model, the migration, and the factory, compared with an EF Core entity, its configuration, and its migrations.
