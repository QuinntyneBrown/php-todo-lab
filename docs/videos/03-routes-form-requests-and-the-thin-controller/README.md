# 03 · Routes, Form Requests and the thin controller

> **Runtime:** ~10 min · **Audience:** senior .NET engineers who know attribute routing, model binding, and FluentValidation · **Prerequisites:** videos 01 and 02

**Video:** [03-routes-form-requests-and-the-thin-controller.mp4](03-routes-form-requests-and-the-thin-controller.mp4) · [Slides](slides.html) · **Audio:** [03-routes-form-requests-and-the-thin-controller.mp3](03-routes-form-requests-and-the-thin-controller.mp3) · [Transcript](script.md)

## Why this video exists

The HTTP layer is where a reviewer sees most pull requests begin. Its three files, `routes/api.php`, the Form Requests, and `TodoController`, each carry a convention that is easy to break by accident: route order, typed accessors instead of raw input, and a controller that never contains logic. This video explains each convention through the .NET feature it replaces.

## Learning objectives

By the end, the viewer can:

- Read `routes/api.php` and explain why static routes precede parameterised ones and what `whereUlid` guarantees.
- Write a Form Request with `rules()` and a typed accessor, and explain when validation runs.
- Use `sometimes`, `required_without`, `boolean:strict`, `Rule::enum`, wildcard `ids.*` rules, and a closure rule.
- Write a controller method that receives a Form Request, a route parameter, and an Action by method injection, and returns a Resource.
- Explain why the controller takes the id as a string instead of using route model binding.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| Why are `todos/completed` and `todos/restore` declared first? | Laravel matches in registration order; a `{todo}` route first would read `completed` as an id |
| What does `whereUlid('todo')` do? | A malformed id matches no route and ends in 404 before any database access (L2-014) |
| When does a Form Request validate? | When the container resolves it for the controller method; failure throws `ValidationException` → 422 |
| Why `$request->title()` rather than `$request->all()`? | Typed, validated value at the call site; Larastan can check it; unvalidated keys never pass through |
| Why `boolean:strict`? | `boolean` accepts `"1"`, `"true"`, `1`; the contract requires 422 for non-boolean values (L2-009) |
| Why not route model binding? | The Action owns the not-found rule (deleted is 404 for update, valid for restore) and stays unit-testable |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/routes/api.php` | All seven routes, the ordering comment, `whereUlid` |
| `backend/app/Http/Requests/Api/V1/StoreTodoRequest.php` | `rules()` and `title()` |
| `backend/app/Http/Requests/Api/V1/ListTodosRequest.php` | `Rule::enum` and the `status()` accessor |
| `backend/app/Http/Requests/Api/V1/UpdateTodoRequest.php` | `required_without`, `boolean:strict`, `changes()` |
| `backend/app/Http/Requests/Api/V1/RestoreTodosRequest.php` | Wildcard rule and the one-pass `distinct` closure rule |
| `backend/app/Http/Controllers/Api/V1/TodoController.php` | `index`, `store`, `update`, `destroy` |
| `docs/detailed-designs/architecture/backend-layering/diagrams/sequence-patch-through-layers.png` | The PATCH request through every layer |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-00:50 | Introduction | What the video covers and the four questions |
| 00:50-02:20 | Routes | The routes file, ordering, `whereUlid` |
| 02:20-05:40 | Form Requests | Concept, `StoreTodoRequest`, `ListTodosRequest`, `UpdateTodoRequest`, `RestoreTodosRequest` |
| 05:40-07:40 | Controller | The class, each method mapped, why the id stays a string |
| 07:40-08:50 | End to end | The PATCH sequence diagram and pitfalls |
| 08:50-09:30 | Recap | Things to remember and a preview of video 04 |

## Demo commands

```sh
cd backend
cat routes/api.php
ls app/Http/Requests/Api/V1
php artisan route:list --path=api/v1
curl -s -X POST http://localhost:8000/api/v1/todos -H 'Content-Type: application/json' -d '{"title":"Buy oat milk"}'
curl -s http://localhost:8000/api/v1/todos?status=bogus
```

## Pitfalls

- Reordering routes so a parameterised route precedes a static one.
- `$request->all()` or `$request->input()` in a controller.
- `boolean` instead of `boolean:strict`.
- Route model binding where the not-found rule differs per route.
- Logic or queries in a controller method.

## References

- Laravel, routing: https://laravel.com/docs/routing
- Laravel, validation and Form Requests: https://laravel.com/docs/validation#form-request-validation
- Laravel, available validation rules: https://laravel.com/docs/validation#available-validation-rules
- Laravel, controllers: https://laravel.com/docs/controllers
- ASP.NET Core routing: https://learn.microsoft.com/aspnet/core/fundamentals/routing
