# 04 · Actions and the repository port

> **Runtime:** ~11 min · **Audience:** senior .NET engineers who use MediatR and Clean Architecture · **Prerequisites:** videos 01 to 03

**Video:** [04-actions-and-the-repository-port.mp4](04-actions-and-the-repository-port.mp4) · [Slides](slides.html) · **Audio:** [04-actions-and-the-repository-port.mp3](04-actions-and-the-repository-port.mp3) · [Transcript](script.md)

## Why this video exists

The Actions and the `TodoRepository` interface are the application layer of this backend, and they are where a reviewer must hold the line on dependency direction. A MediatR user recognises the shape immediately but needs to know what is deliberately absent (no mediator, no pipeline behaviours), where business rules sit, and why the repository owns transactions and returns Eloquent models.

## Learning objectives

By the end, the viewer can:

- Explain an Action as a handler whose `handle` parameters are the command, and what a mediator pipeline would have added.
- Read all seven Actions and state the rule each one encodes, including the idempotent completion in `UpdateTodo`.
- Describe the `TodoRepository` contract, why it is shaped by use cases, and why transactions live behind it.
- Explain the two domain exceptions and how they reach the renderer.
- Add a use case or a filter following the open/closed recipe in the backend layering design.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| How is an Action different from a MediatR handler? | No command object, no `Send`, no pipeline behaviours; same single responsibility and interface dependency |
| Where does the "at most 500" rule live? | The constant in `CreateTodo`; the atomic check-and-insert in `EloquentTodoRepository::createWithinLimit` |
| Why does `UpdateTodo` use `??` on `completed_at`? | Completing an already completed todo keeps the original timestamp (L2-009 criterion 3) |
| Why do Delete and Restore both take a string id? | `find` sees live rows, `findDeleted` sees trashed rows: different not-found rules for the same id |
| Why does the repository own transactions? | A persistence concern; the in-memory fake needs none; Actions stay database-free |
| How do you add a filter without touching `ListTodos`? | New enum case, new scope, one new `match` arm, a test |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `docs/detailed-designs/architecture/backend-layering/diagrams/class-structure.png` | Controller, Actions, interface, implementations, model |
| `backend/app/Actions/Todos/CreateTodo.php` | The whole class, beside a MediatR equivalent |
| `backend/tests/Unit/Actions/CreateTodoTest.php` | Constructing an Action with the fake |
| `backend/app/Actions/Todos/ListTodos.php`, `TodoList.php` | Query plus a readonly result record |
| `backend/app/Actions/Todos/UpdateTodo.php` | The `handle` method and its requirement-citing comment |
| `backend/app/Actions/Todos/DeleteTodo.php`, `RestoreTodo.php` | `find` versus `findDeleted` |
| `backend/app/Actions/Todos/ClearCompletedTodos.php`, `RestoreTodos.php` | The bulk pair |
| `backend/app/Repositories/TodoRepository.php` | The first five methods with docblocks |
| `backend/app/Exceptions/TodoNotFound.php`, `TodoLimitReached.php` | Exceptions with readonly data |
| `backend/app/Providers/AppServiceProvider.php`, `backend/tests/Fakes/InMemoryTodoRepository.php` | The binding and the fake |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-00:55 | Introduction | Class diagram and the four questions |
| 00:55-02:30 | Actions | Action versus handler, what is lost and kept |
| 02:30-05:20 | Use cases | `ListTodos`, `UpdateTodo`, delete and restore, the bulk pair, what no Action does |
| 05:20-07:20 | Repository | The interface and three comparisons with `ITodoRepository` |
| 07:20-08:10 | Exceptions | Domain exceptions and the binding |
| 08:10-09:35 | Extending | Adding a use case, adding a filter, pitfalls |
| 09:35-10:20 | Recap | Things to remember and a preview of video 05 |

## Demo commands

```sh
cd backend
ls app/Actions/Todos
cat app/Actions/Todos/UpdateTodo.php
cat app/Repositories/TodoRepository.php
vendor/bin/pest tests/Unit/Actions
```

## Pitfalls

- Injecting the model or a query builder into an Action.
- A second public method on an Action.
- Loose arrays where a readonly result class belongs.
- Catching domain exceptions inside Actions.
- `DB::transaction` inside an Action.

## References

- Backend layering design: `docs/detailed-designs/architecture/backend-layering/README.md`
- Laravel, service container binding: https://laravel.com/docs/container#binding
- Laravel, Eloquent: https://laravel.com/docs/eloquent
- MediatR: https://github.com/jbogard/MediatR
- Clean Architecture (Robert C. Martin): https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
