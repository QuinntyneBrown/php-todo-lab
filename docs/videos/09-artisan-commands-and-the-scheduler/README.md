# 09 · Artisan commands and the scheduler

> **Runtime:** ~9 min · **Audience:** senior .NET engineers who know `BackgroundService`, Quartz or Hangfire, and `TimeProvider` · **Prerequisites:** videos 02, 04 and 06

**Video:** [09-artisan-commands-and-the-scheduler.mp4](09-artisan-commands-and-the-scheduler.mp4) · [Slides](slides.html) · **Audio:** [09-artisan-commands-and-the-scheduler.mp3](09-artisan-commands-and-the-scheduler.mp3) · [Transcript](script.md)

## Why this video exists

Background work in PHP has no long-lived process to live in, so Laravel uses command classes, a schedule declared in code, and system cron. The backend's one command, `todos:purge-deleted`, also carries a chunking rule that protects the live API. A .NET developer needs the model, the production configuration that is easy to forget, and the time-travel test helpers.

## Learning objectives

By the end, the viewer can:

- Write an Artisan command with `$signature`, `$description`, and a `handle()` that receives dependencies by method injection and returns an exit code.
- Explain the chunked purge loop and the split between command and repository.
- Declare a schedule in `routes/console.php` and configure cron to run `schedule:run`.
- Compare the model with hosted services, job frameworks, and `TimeProvider`.
- Test a command with `travelTo`, `freezeTime`, `$this->artisan`, `Log::spy`, and read the schedule from the container.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| How is the command registered? | Auto-discovered from `app/Console/Commands`; `$signature` names it |
| Why chunks of 500? | A single large `DELETE` holds locks; short statements never block the API (L2-016) |
| What fires the schedule? | Cron runs `php artisan schedule:run` each minute; `schedule:work` locally |
| What time zone does it use? | The application zone, fixed to UTC |
| How do tests move time? | `travelTo`, `travelBack`, `freezeTime` on the clock `now()` reads |
| How is the schedule tested? | Resolve `Schedule`, filter events for the command, assert expression `0 * * * *` |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/app/Console/Commands/PurgeDeletedTodos.php` | The whole class |
| `backend/app/Repositories/EloquentTodoRepository.php` | `purgeDeletedBefore` |
| `backend/routes/console.php` | The schedule line |
| `backend/tests/Feature/Console/PurgeDeletedTodosTest.php` | Helper, boundary test, log test, chunk test, schedule test |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:10 | Introduction | No long-lived process; the four questions |
| 01:10-03:20 | The command | Class, `handle`, the chunk loop and why |
| 03:20-05:40 | The schedule | `routes/console.php`, how cron fires it, comparison table |
| 05:40-08:10 | Testing | Time travel, output and log, chunks, schedule, what the tests are not, pitfalls |
| 08:10-08:55 | Recap | Things to remember and a preview of video 10 |

## Demo commands

```sh
cd backend
php artisan list | grep todos
php artisan todos:purge-deleted
php artisan schedule:list
php artisan schedule:work
vendor/bin/pest tests/Feature/Console
```

## Pitfalls

- Database calls in the command instead of the repository.
- One large `DELETE`.
- No exit code on failure.
- Missing cron entry in production.
- Schedule tests that run with real time.

## References

- Laravel, Artisan console: https://laravel.com/docs/artisan
- Laravel, task scheduling: https://laravel.com/docs/scheduling
- Laravel, console tests: https://laravel.com/docs/console-tests
- Laravel, time manipulation in tests: https://laravel.com/docs/mocking#interacting-with-time
- .NET, `BackgroundService`: https://learn.microsoft.com/dotnet/core/extensions/workers
