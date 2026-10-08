# 10 · Testing with Pest

You have seen tests in every video so far, because in this repository the tests are the specification made executable. This video steps back and reads the suite as a whole: Pest's syntax against xUnit and FluentAssertions, the two test layers and what each one proves, `RefreshDatabase` against Respawn and Testcontainers, the coverage gate, and the acceptance test-driven workflow that `AGENTS.md` makes mandatory.

## What you will be able to answer

By the end you will be able to answer: how Pest's `it`, `expect`, datasets and hooks map onto `Fact`, `Theory`, `Assert` and fixtures, what a unit test of an Action looks like with the in-memory fake, what a feature test looks like against MySQL and how the database is reset, what the coverage gate covers and why, and how the ATDD loop in this repository runs for a new slice.

## Pest in one slide

Pest is a test runner and syntax layer on top of PHPUnit, the way xUnit sits on a test host. Open any test file. A test is `it` with a description string and a closure. Assertions use `expect` with a fluent chain: `expect($todo->title)->toBe('Buy oat milk')`, and `and` continues the chain on a new subject, which reads like FluentAssertions. A dataset is `with` after the closure, taking a keyed array, and the closure receives each row as parameters: that is `Theory` plus `InlineData`, with the key shown in the output. `throws` after the closure asserts an exception type, `beforeEach` is the per-test setup where `$this` is the test case, `group` tags a test, and plain functions at the top of a file are shared helpers, with `test()` giving a helper access to the test case.

Two files configure it. `tests/Pest.php` says that tests under `Feature` extend the Laravel `TestCase` and use `RefreshDatabase`, and tests under `Unit` extend the `TestCase` without it. `phpunit.xml` declares the two suites, points coverage at `app/Actions` and `app/Repositories`, and sets the testing environment: the `todo_test` database, array cache and session, and a synchronous queue. That file is your test `appsettings` and your test host configuration together.

## Layer one: unit tests with the fake

Open `tests/Unit/Actions/UpdateTodoTest.php`. The file starts with a docblock, "Traces to: L2-009, L2-014", which is the convention from the specs: every acceptance test names the requirements it covers, as a comment a reviewer checks, never parsed by a tool. `beforeEach` creates a new `InMemoryTodoRepository` and an `UpdateTodo` Action around it. The tests then call `handle` and assert on the returned model: completing and reopening, keeping `completedAt` when completing twice, renaming without touching completion, and throwing `TodoNotFound` for an unknown or deleted id.

The fake is in `tests/Fakes`. It implements the full interface over an array keyed by id, with a `seed` method that takes named arguments for title, completed, and deleted and advances a fixed clock by one second per row so ordering is deterministic. No database, no container, no mocking library: these tests run in milliseconds, and requirement L2-051 asks for exactly this layer, covering success, validation, and not-found paths. If you would reach for Moq or NSubstitute here, notice that a hand-written fake of a use-case-shaped interface is small, typed, and reads like documentation of the contract.

## Layer two: feature tests against MySQL

Open `tests/Feature/Api/V1/CreateTodoTest.php`. Each test sends a request through Laravel's HTTP test client, `$this->postJson` with a path and a body, and asserts on the response: `assertCreated`, `assertJsonPath` for a value, `assertHeader` for the `Location` header, `assertUnprocessable` and `assertJsonValidationErrors` for the 422 path. Then it often reaches into the database through the model to assert the row, for example that the title was stored, or that a rejected title created nothing. The dataset test is the one to copy: five bodies, missing, empty, whitespace-only, a number, and an array, each expected to fail validation on `title`.

This is `WebApplicationFactory` without the factory. The request runs through the real router, middleware, Form Request, controller, Action, repository, and renderer, in-process, with no web server. Requirement L2-051 says these tests exercise every endpoint over HTTP against a real MySQL instance, not SQLite, because the backend depends on InnoDB behaviour: locking reads, the `utf8mb4` collation, and millisecond timestamps. One file per endpoint lives in `tests/Feature/Api/V1`, plus `ProblemDetailsTest`, `TodoLimitTest`, `UtcTimestampsTest`, and `LatencyTest`, and `tests/Feature/Models` and `tests/Feature/Console` cover the schema and the command.

`RefreshDatabase` is how the database stays clean. On the first test it runs the migrations against `todo_test`, then it wraps every test in a transaction and rolls it back at the end. That is Respawn's reset without the deletes, and Testcontainers' isolation without a container, at the cost that other processes cannot see the test's rows. Video six showed the workaround for the concurrency tests: a second connection named `committed` that is not wrapped, with cleanup in a `finally` block. If you see that pattern, it is deliberate.

Time is controlled too: `freezeTime`, `travelTo` and `travel` move the clock that `now()` reads, which the list-ordering tests use to create todos one second apart and the purge tests use to age rows. No sleeping, no real waiting.

## The coverage gate and the test command

`composer test` runs three things in order. It clears the configuration cache. It runs Pest with coverage and a minimum of ninety percent, excluding the performance group. Then it runs the performance group alone with the `pcov` extension disabled, so the latency timings are not distorted by instrumentation. The coverage source in `phpunit.xml` is only `app/Actions` and `app/Repositories`, because requirement L2-051 criterion three puts the gate on Action and repository code, where the behaviour lives, rather than on controllers and Resources, which the feature tests exercise anyway. A gate on everything would reward tests of glue; this gate rewards tests of rules.

## The workflow: a failing test first

`AGENTS.md` makes acceptance test-driven development mandatory for every production behaviour change, under the `incremental-implementation` skill. The loop for one slice is: write the Given-When-Then criteria, write the acceptance test with its "Traces to" header, run it and confirm it fails for the expected reason, write only the production code that makes it pass, refactor with the tests green, and run the relevant checks before the next slice. The expected-reason step matters: a test that fails because of a typo in the test proves nothing. For a new endpoint that means a feature test that gets a 404 before the route exists; for a new rule in an Action, a unit test with the fake that fails on the assertion.

There is one more rule a .NET architect will want to break: never write architecture tests. No test asserts the folder layout, class naming, banned APIs, or that every test file has a traces header. Those belong to Larastan, Pint, and review. The suite proves behaviour only, and a pull request that adds a structure test is declined.

## Pitfalls

Switching the test database to SQLite for speed; the suite depends on MySQL semantics and L2-051 forbids it. Creating rows with `DB::table` or SQL instead of factories. Mocking the repository with Mockery in an Action test when the fake already exists. Asserting on the shape of the code instead of its behaviour. Forgetting the "Traces to" header. And writing a test after the implementation and calling it ATDD; the failing run is the evidence, and the reviewer will ask about it.

## Things to remember

Pest is `it`, `expect`, `with`, `throws`, `beforeEach`, and helper functions, over PHPUnit. Unit tests build an Action around `InMemoryTodoRepository` and run without a database. Feature tests send real requests through the whole pipeline against MySQL, reset by `RefreshDatabase` transactions, with factories for data and time travel for clocks. The coverage gate is ninety percent on Actions and repositories, and the performance group runs without instrumentation. Every slice starts with a failing acceptance test that traces to a requirement, and no test asserts structure.

Next, the quality gates around the tests: Pint, Larastan at level eight, `composer check`, and the CI workflow, compared with `dotnet format`, analysers, and nullable reference types.
