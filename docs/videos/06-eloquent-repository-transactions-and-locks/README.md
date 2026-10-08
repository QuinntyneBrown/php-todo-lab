# 06 · The Eloquent repository: queries, transactions and locks

> **Runtime:** ~9 min · **Audience:** senior .NET engineers who know EF Core querying, change tracking, `ExecuteUpdate`, transactions and isolation levels · **Prerequisites:** videos 04 and 05

**Video:** [06-eloquent-repository-transactions-and-locks.mp4](06-eloquent-repository-transactions-and-locks.mp4) · [Slides](slides.html) · **Audio:** [06-eloquent-repository-transactions-and-locks.mp3](06-eloquent-repository-transactions-and-locks.mp3) · [Transcript](script.md)

## Why this video exists

`EloquentTodoRepository` is the only class that queries the database, and it carries every concurrency decision in the backend: a query-level update instead of a model save, a locking read inside a retried transaction for the 500-todo cap, all-or-nothing bulk operations, and chunked purging. Each decision has a test that races or faults it. A reviewer needs to recognise both the decision and the test.

## Learning objectives

By the end, the viewer can:

- Compose a query from scopes and explain `get()->toBase()`.
- Explain why `update` writes every given column in one statement and how that satisfies L2-043.
- Explain `DB::transaction(fn, attempts: 3)` with `lockForUpdate()` and the InnoDB next-key locks behind it.
- Read the bulk operations and the fault-injection tests that prove rollback.
- Explain `purgeDeletedBefore` and the chunking contract with the command.
- Run the performance group and explain why it runs without coverage.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| Why `toBase()`? | The interface declares the plain support collection, not Eloquent's, so Actions depend on the generic type |
| Why not `$todo->fill()->save()`? | Dirty tracking skips "clean" columns; a concurrent patch could be half-applied; one `UPDATE` with every column is `ExecuteUpdate` |
| How is the cap atomic? | `SELECT ... FOR UPDATE` count takes next-key locks; the second create waits, then counts 500; deadlocks retried by `attempts: 3` |
| How is the bulk delete all-or-nothing? | One transaction: locking read of ids, one `whereIn` delete; `DB::listen` throws on `UPDATE` in the test and the rows survive |
| How are old rows purged? | `onlyTrashed()->where(...)->limit(500)->forceDelete()` in a loop until a batch is short |
| Why a separate performance group? | Coverage instrumentation distorts timings; `composer test` runs it with `pcov.enabled=0` |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/app/Repositories/EloquentTodoRepository.php` | `list`, `counts`, `find`, `delete`, `findDeleted`, `update`, `createWithinLimit`, `deleteCompleted`, `restoreMany`, `purgeDeletedBefore` |
| `backend/tests/Feature/Api/V1/UpdateTodoTest.php` | The concurrent patch test |
| `docs/detailed-designs/api-platform/persist-todos/diagrams/sequence-create-with-cap.png` | Create with the cap check |
| `backend/tests/Feature/Api/V1/TodoLimitTest.php` | Six concurrent creates |
| `backend/tests/Feature/Api/V1/ClearCompletedTodosTest.php` | `DB::listen` fault injection |
| `backend/tests/Feature/Api/V1/LatencyTest.php` | The 200 ms budget |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:00 | Introduction | Scope and the five questions |
| 01:00-02:20 | Queries | `list`, the EF Core shape, `counts`/`find`/`findDeleted` |
| 02:20-03:45 | Update | One statement, every column; the racing test |
| 03:45-05:35 | The cap | `createWithinLimit`, the diagram, the EF comparison, the six-process test |
| 05:35-08:10 | Bulk and purge | Bulk operations, fault injection, purge, latency, pitfalls |
| 08:10-08:55 | Recap | Things to remember and a preview of video 07 |

## Demo commands

```sh
cd backend
cat app/Repositories/EloquentTodoRepository.php
vendor/bin/pest tests/Feature/Api/V1/TodoLimitTest.php
vendor/bin/pest tests/Feature/Api/V1/ClearCompletedTodosTest.php
php -d pcov.enabled=0 vendor/bin/pest --group=performance
```

## Pitfalls

- Model `save()` in `update`.
- Counting without `lockForUpdate()`.
- Dropping `attempts: 3`.
- Returning an Eloquent collection where the interface says the base collection.
- Per-row deletes in bulk operations.
- Mocked concurrency tests.

## References

- Laravel, database transactions: https://laravel.com/docs/database#database-transactions
- Laravel, pessimistic locking: https://laravel.com/docs/queries#pessimistic-locking
- Laravel, query builder updates: https://laravel.com/docs/queries#update-statements
- MySQL, locking reads: https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html
- MySQL, next-key locks: https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html
- EF Core, `ExecuteUpdate`: https://learn.microsoft.com/ef/core/saving/execute-insert-update-delete
- EF Core, connection resiliency: https://learn.microsoft.com/ef/core/miscellaneous/connection-resiliency
