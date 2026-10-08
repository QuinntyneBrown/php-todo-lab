# 10 · Testing with Pest

> **Runtime:** ~10 min · **Audience:** senior .NET engineers who use xUnit, FluentAssertions, `WebApplicationFactory`, Respawn or Testcontainers · **Prerequisites:** videos 04 to 06

**Video:** [10-testing-with-pest.mp4](10-testing-with-pest.mp4) · [Slides](slides.html) · **Audio:** [10-testing-with-pest.mp3](10-testing-with-pest.mp3) · [Transcript](script.md)

## Why this video exists

Tests are the executable specification of this repository, and the ATDD workflow in `AGENTS.md` is mandatory. A .NET developer needs the Pest syntax mapped onto xUnit, the two test layers and what each proves, the `RefreshDatabase` model and its one limitation, the coverage gate's deliberate scope, and the rule against architecture tests.

## Learning objectives

By the end, the viewer can:

- Read and write Pest tests with `it`, `expect`, `with`, `throws`, `beforeEach`, and file-level helpers.
- Write a unit test of an Action with `InMemoryTodoRepository`.
- Write a feature test with `postJson` and the response assertions, against MySQL with `RefreshDatabase`.
- Use `freezeTime`, `travelTo`, and factories instead of sleeping and SQL.
- Explain the coverage gate's scope and the three steps of `composer test`.
- Run the ATDD loop for one slice and reject structure tests in review.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| What is Pest? | A runner and syntax layer over PHPUnit: `it`, `expect`, datasets with `with`, `throws`, `beforeEach` |
| How are Actions unit-tested? | `new UpdateTodo(new InMemoryTodoRepository)`, `seed(...)`, assert on the returned model; no database |
| How are endpoints tested? | `$this->postJson(...)` through the full pipeline in-process against MySQL; one file per endpoint |
| How is the database reset? | `RefreshDatabase`: migrate once, transaction per test, rolled back; concurrency tests use a `committed` connection |
| What does the gate cover? | 90% of `app/Actions` and `app/Repositories`; performance group runs with `pcov` off |
| What is the loop? | Criteria, test with "Traces to", fail for the expected reason, implement, refactor, checks |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/tests/Pest.php` | Suite configuration |
| `backend/phpunit.xml` | Coverage source and environment |
| `backend/tests/Unit/Actions/UpdateTodoTest.php` | `beforeEach`, three tests |
| `backend/tests/Fakes/InMemoryTodoRepository.php` | `seed()` |
| `backend/tests/Feature/Api/V1/CreateTodoTest.php` | The 201 test and the dataset test |
| `backend/composer.json` | The `test` script |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:00 | Introduction | Scope and the five questions |
| 01:00-02:45 | Pest | Syntax mapping, the two configuration files |
| 02:45-04:35 | Unit tests | `UpdateTodoTest`, the fake |
| 04:35-07:00 | Feature tests | `CreateTodoTest`, `RefreshDatabase`, time, MySQL |
| 07:00-09:25 | Gate and workflow | `composer test`, the ATDD loop, no architecture tests, pitfalls |
| 09:25-10:10 | Recap | Things to remember and a preview of video 11 |

## Demo commands

```sh
cd backend
vendor/bin/pest tests/Unit
vendor/bin/pest tests/Feature/Api/V1/CreateTodoTest.php
vendor/bin/pest --filter 'keeps completedAt'
composer test
```

## Pitfalls

- SQLite instead of MySQL.
- SQL or `DB::table` instead of factories.
- Mockery where the fake exists.
- Structure tests.
- Missing "Traces to" headers.
- Tests written after the implementation.

## References

- Pest: https://pestphp.com/docs/writing-tests
- Pest datasets: https://pestphp.com/docs/datasets
- Laravel, HTTP tests: https://laravel.com/docs/http-tests
- Laravel, database testing: https://laravel.com/docs/database-testing
- xUnit: https://xunit.net/docs/getting-started/v2/getting-started
- ASP.NET Core integration tests: https://learn.microsoft.com/aspnet/core/test/integration-tests
