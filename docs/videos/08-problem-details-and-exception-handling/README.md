# 08 · Problem details and exception handling

> **Runtime:** ~8 min · **Audience:** senior .NET engineers who know `ProblemDetails` and `IExceptionHandler` · **Prerequisites:** videos 02 to 04

**Video:** [08-problem-details-and-exception-handling.mp4](08-problem-details-and-exception-handling.mp4) · [Slides](slides.html) · **Audio:** [08-problem-details-and-exception-handling.mp3](08-problem-details-and-exception-handling.mp3) · [Transcript](script.md)

## Why this video exists

Laravel's default error responses are not problem details, and some of them are HTML. The backend replaces them with a single renderer that maps every exception on an API path to RFC 9457, with the status, detail, and extension members the contract and the frontend rely on. A reviewer must know the mapping, the ordering rule inside the `match`, and the tests that pin each status.

## Learning objectives

By the end, the viewer can:

- Register an exception renderer in `bootstrap/app.php` and compare it with `IExceptionHandler`.
- Read `ProblemDetailsRenderer` arm by arm and state the status, detail, and extras for each cause.
- Explain why the renderer matches on the path and why arm order matters.
- Explain how the 500 arm prevents information leaks.
- Write a feature test that asserts a problem-details response.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| Where is the renderer registered? | `withExceptions` in `bootstrap/app.php` with `$exceptions->render(new ProblemDetailsRenderer)` |
| Why check `$request->is('api', 'api/*')`? | The API must never return HTML regardless of `Accept` (L2-020) |
| What does a validation failure return? | 422, `application/problem+json`, `detail` "One or more fields are invalid.", `errors` map |
| What does the limit return? | 422 with `code: todo_limit_reached` and the sentence in `detail` and `errors.title` (L2-003) |
| Why do router 404s and `TodoNotFound` share a detail? | So a client cannot distinguish a missing route from a missing row |
| What does a crash return? | 500 with a fixed sentence; the message, class, and trace never appear; reporting still logs it |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/bootstrap/app.php` | The `withExceptions` callback |
| `backend/app/Exceptions/ProblemDetailsRenderer.php` | Class docblock, `__invoke`, the `match`, `problem()` |
| `backend/tests/Feature/Api/V1/ProblemDetailsTest.php` | `assertProblem`, the 404 dataset, the 500 leak test |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:25 | Introduction | The defaults, the one-class replacement, the five questions |
| 01:25-02:15 | Registration | `withExceptions` versus `IExceptionHandler` |
| 02:15-05:30 | The renderer | Path check, the arms in order, the mapping table |
| 05:30-08:00 | Body and tests | `problem()`, the body shape, the tests, pitfalls |
| 08:00-08:50 | Recap | Things to remember and a preview of video 09 |

## Demo commands

```sh
cd backend
cat app/Exceptions/ProblemDetailsRenderer.php
vendor/bin/pest tests/Feature/Api/V1/ProblemDetailsTest.php
curl -si http://localhost:8000/api/v1/todos?status=bogus
curl -si -X PUT http://localhost:8000/api/v1/todos
curl -si http://localhost:8000/api/v2/todos -H 'Accept: text/html'
```

## Pitfalls

- Hand-built error JSON outside the renderer.
- Matching on `Accept` instead of the path.
- Generic arms before specific ones.
- Echoing exception messages in 500 responses.
- Domain exceptions without an arm and a test.

## References

- RFC 9457, Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457
- Laravel, handling exceptions: https://laravel.com/docs/errors
- ASP.NET Core, handle errors in web APIs: https://learn.microsoft.com/aspnet/core/web-api/handle-errors
- REST API contract design: `docs/detailed-designs/api-platform/rest-api-contract/README.md`
