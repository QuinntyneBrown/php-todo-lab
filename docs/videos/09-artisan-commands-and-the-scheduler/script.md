# 09 · Artisan commands and the scheduler

Every backend has work that does not belong to a request. In .NET you reach for a `BackgroundService` with a `PeriodicTimer`, or Quartz, or Hangfire, all of which assume a process that stays alive. PHP's request model has no such process, so Laravel solves scheduled work differently: a command class, a schedule declared in code, and a system cron that ticks once a minute. This video reads the one command in the backend, `todos:purge-deleted`, the schedule entry that runs it hourly, and the tests that prove both.

## What you will be able to answer

By the end you will be able to answer: how an Artisan command is declared and how it receives dependencies, how the purge deletes in chunks and why, how the scheduler runs without a long-lived process and what you must configure in production, and how commands and schedules are tested, including time travel.

## The command class

Open `app/Console/Commands/PurgeDeletedTodos.php`. It is a final class extending Laravel's `Command`. Two typed constants state the policy: a retention of twenty-four hours and a chunk size of five hundred, with a comment that small chunks keep each delete short so it never holds long locks. Two properties declare the command: `$signature` is the name you type after `php artisan`, here `todos:purge-deleted`, and `$description` is the help text. In .NET terms this is a `System.CommandLine` command or a console project's entry point, except that Laravel discovers it: any command class in `app/Console/Commands` is registered automatically, and `php artisan list` shows it.

The `handle` method does the work and returns an integer exit code. Look at its signature: it takes a `TodoRepository`. That is method injection from the container, the same mechanism as controller methods in video three, so the command depends on the interface, not on Eloquent, and nothing in this class touches the database directly. In a .NET hosted service you would inject the same interface through the constructor.

The body computes the cutoff as now minus twenty-four hours, as an immutable date, then loops: call `purgeDeletedBefore` with the cutoff and the chunk size, add the returned count, and repeat while the chunk came back full. A short chunk means the last batch is done. Then it writes one message, "Purged n soft-deleted todos.", both to the log through the `Log` facade and to the console through `$this->info`, and returns `self::SUCCESS`, which is zero. The whole command is thirty lines and reads top to bottom.

Why loop in chunks rather than issue one delete? Requirement L2-016 criterion four: a single `DELETE` over thousands of rows holds row locks for the length of the statement and can block the live API. Five hundred at a time keeps every statement short. The repository method from video six applies the limit; the command owns the loop. That split keeps the policy, how many and how old, in the command, and the SQL in the repository.

## The schedule

Open `routes/console.php`. One line: `Schedule::command('todos:purge-deleted')->hourly()`. That is the whole schedule, declared in code rather than in a crontab, which means it is versioned, reviewed, and testable. `hourly` means at minute zero of every hour, and the test checks the resulting cron expression is `0 * * * *`. The application time zone is UTC, so the schedule runs in UTC.

Now the part that surprises .NET developers. Nothing in Laravel stays running to fire that schedule. In production you add one line to the system crontab: run `php artisan schedule:run` every minute. Each minute, that command boots the application, evaluates every scheduled task's expression against the current time, runs the ones that are due, and exits. The scheduler is stateless between ticks, which is exactly the shared-nothing model from video one applied to background work. Locally, `php artisan schedule:work` keeps a foreground process that does the same loop for you, and `php artisan todos:purge-deleted` runs the command once on demand.

Compare that with a `BackgroundService`. There, the timer lives in your process, so a restart resets it, and two instances behind a load balancer each run the job unless you add distributed locking. Here, cron is the timer, and running on a single server is the default; Laravel offers `onOneServer` and `withoutOverlapping` modifiers when you scale out, which this single-user project does not need. Laravel also has queues and workers for asynchronous jobs triggered by requests, which is the Hangfire-shaped tool; this backend has no queued jobs, so the queue connection is `sync` in the environment file.

## Testing commands and schedules

Open `tests/Feature/Console/PurgeDeletedTodosTest.php`. It has a helper, `deletedHoursAgo`, that travels back in time with `travelTo`, creates todos through the factory, soft-deletes them with `each->delete`, and travels back. That is Laravel's time control: `now()` reads a clock that tests can move with `travelTo`, `travel`, and `freezeTime`, the equivalent of injecting a `TimeProvider` and using a fake one, but with no injection needed because `now()` is the global helper that the command uses.

The first test freezes time, creates rows deleted twenty-five, twenty-four, and twenty-three hours ago plus a live one, runs the command with `$this->artisan`, asserts success, and asserts that three rows remain across live and trashed, with only the live one visible. That pins the boundary: strictly older than twenty-four hours is purged, exactly twenty-four is kept. The second test spies on the `Log` facade, runs the command with nothing eligible, and asserts both the console output and the logged message say zero, with exit code zero. The third creates one thousand two hundred and one old rows and asserts they are all gone, which exercises the chunk loop across three batches. The fourth resolves the `Schedule` from the container, filters its events for the command, and asserts there is exactly one with the hourly expression.

Notice what these tests are not. They are not unit tests of the command with a mocked repository; they run against MySQL through the real repository, because the behaviour being proved is "rows older than a day are gone". And the schedule test does not run the scheduler; it reads the declared schedule, which is the behaviour that matters and runs in milliseconds.

## Pitfalls

Calling `DB` or `Todo::query` from the command instead of the repository, which breaks the layering and skips the chunk contract. Deleting in one statement, which holds locks. Returning nothing from `handle`, which still exits zero but hides failures; return `self::FAILURE` on error. Forgetting the one cron line in production, so the schedule never runs; the local `schedule:work` hides that. And writing a schedule test that executes the command through the scheduler with real time, which is slow and flaky; read the schedule instead.

## Things to remember

A command is a class with a signature, a description, and a `handle` method that receives dependencies by method injection and returns an exit code. The purge computes a cutoff and loops in chunks of five hundred through the repository, logging one line. The schedule is one line of code, and cron runs `schedule:run` every minute to fire it; nothing stays alive. Tests travel in time with `travelTo` and `freezeTime`, run the command with `$this->artisan`, spy on the log, and read the schedule from the container.

Next, the test suite itself: Pest, the in-memory fake, feature tests against MySQL, and how it compares with xUnit and `WebApplicationFactory`.
