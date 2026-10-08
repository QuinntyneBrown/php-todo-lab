# 12 · Reviewing a PHP pull request

Eleven videos have read every layer of the backend. This one turns that reading into a job: reviewing a pull request against this repository so that the layering, the contract, the tests, and the tooling rules all hold. It gives you a review order, a checklist per layer, a list of things that look wrong but are right, and a worked example of one feature slice from requirement to green check, so that you can both approve and author changes with confidence.

## What you will be able to answer

By the end you will be able to answer: what a pull request here must contain before the code is even read, in which order to review it, what to check in each layer, which deliberate choices a .NET reviewer is tempted to "fix", and how a new slice is built test-first from a requirement.

## Before reading the code

Open `.github/PULL_REQUEST_TEMPLATE.md`. It asks for a summary, the issue it resolves, the L2 requirement ids the change implements, and a checklist: `CONTRIBUTING.md` read; a requirement, a detailed design, and a mock for every behaviour change; each acceptance test written first and seen to fail for the expected reason; `composer check` passing in `backend`; `npm run check` in `frontend`; the end-to-end suite if the UI changed; and formatting changes in separate commits.

Your first pass is that checklist, not the diff. `AGENTS.md` makes the artefacts mandatory for production behaviour changes: if a pull request changes what an endpoint does and names no L2 requirement in `docs/specs/L2.md` and no design under `docs/detailed-designs`, it is not ready, however good the code. Documentation-only, test-only, mock-only, and design-system-only changes are exempt. Then look at the commit list. A commit that only reformats must contain no behaviour change, and a test commit should precede or accompany the implementation it covers. If the description does not say how the failing run looked, ask.

## The review order

Read in request order, because that is dependency order. Routes, then Form Requests, then the controller, then Actions, then the repository interface and the Eloquent implementation, then the model and migrations, then Resources, then the renderer, then commands, then tests, then the specs and the contract. Each layer has a short list.

Routes: static paths before parameterised ones; every id parameter constrained with `whereUlid`; controllers only, no closures; everything inside the `v1` prefix group. A breaking contract change belongs in a new version, never in v1.

Form Requests: rules in `rules`, a typed accessor per input, no `all` or `input` in the controller; `boolean:strict` for booleans; `Rule::enum` for enums; comments where a rule was chosen over a built-in, as in the one-pass `distinct` check.

Controller: ten lines or fewer per method, one Action call, one Resource, no logic and no queries; status codes and headers set here, not in Resources; the id stays a string.

Actions: `final readonly`, one public `handle`, a constructor that takes `TodoRepository`; no facades, no `Todo::query`, no `DB::transaction`, no catching of domain exceptions; a comment citing the L2 id next to any non-obvious rule; a readonly result class instead of a loose array.

Repository: new behaviour added to the interface with a docblock sentence and implemented in both `EloquentTodoRepository` and `InMemoryTodoRepository`; transactions and locking reads where the contract says atomic; `update` stays a single statement; results narrowed with `toBase`; the list order follows the index.

Model and migrations: `$fillable` never gains `id`; casts stay immutable; the class docblock grows with every column; schema changes are new migration files with named indexes and a comment naming the query they serve; factories gain a state for any new column a test needs.

Resources: contract keys only, camelCase, under `V1`; `meta` through `with`; timestamps through the `iso` rewrite; a change to keys means a change to `docs/specs/L2.md` and the frontend models in the same pull request.

Renderer: a new domain exception gets an arm in `ProblemDetailsRenderer`, placed before the generic arms, and a test that asserts status, content type, and detail.

Commands: dependencies by method injection, work through the repository, chunked writes, an exit code, a schedule entry if it is scheduled, and a test that reads the schedule.

Tests: a "Traces to" header on every file; a feature test per endpoint against MySQL; unit tests of Actions with the fake; factories only; time travel instead of sleeping; no architecture tests; the performance group run if the repository or a Resource changed.

Tooling: `composer check` green; no `@phpstan-ignore`, no baseline; docblocks on every generic type; no `env()` outside `config`; no disabled Pint rule without a name and a reason.

## Looks wrong, is right

A .NET reviewer will want to change several things that are deliberate. The controller takes a string id instead of binding a model: the Actions own the not-found rule. `update` in the repository issues a query-level statement instead of saving the model: concurrent patches must apply in full. `TodoResource` reads raw attributes and rewrites timestamps as strings: the five hundred row list must answer in two hundred milliseconds. The concurrency tests write through a second connection called `committed` and clean up in a `finally`: `RefreshDatabase` wraps the default connection in a transaction other processes cannot see. `deleteCompleted` has an inline `@var` comment: it narrows `pluck` for Larastan. The `match` in `list` has an arm that evaluates to null: `match` must be exhaustive. `$fillable` omits `id`: that is the over-posting defence. None of these need a comment from you, and a pull request that "simplifies" any of them needs a request for changes with the requirement id.

## A worked slice: adding a filter

Here is one slice end to end, using the example the backend layering design gives for the open/closed rule: an `overdue` filter. Due dates are out of scope for this product, so treat it as the design's illustration, not a planned feature. The mechanics are what matter.

Step one, the artefacts: an L2 requirement with Given-When-Then criteria traced to an L1, a design under `docs/detailed-designs`, and a mock if the UI shows the filter. Step two, the failing tests: in `ListTodosTest`, a case that requests `status=overdue` and expects a 200 with only the overdue rows, and in `tests/Unit/Actions/ListTodosTest.php`, a dataset row for the new enum case. Run them. The feature test fails with a 422, because `ListTodosRequest` validates against the enum and `overdue` is not a case. That is the expected reason; write it in the pull request.

Step three, the implementation, in the order the design lists: add the `Overdue` case to `TodoStatus`; add a `scopeOverdue` method to the model with its `Builder` docblock; add one arm to the `match` in `EloquentTodoRepository::list`; add the matching arm to the fake's filter. Now run `composer analyse` before the tests, and notice what Larastan does the moment you add the enum case: every `match` over `TodoStatus` that does not handle `Overdue` is reported as not handling the remaining value, in the repository and in the fake. That is C#'s switch exhaustiveness warning, enforced at level eight, and it is why adding a filter touches exactly those two places and no Action. `ListTodos`, `ListTodosRequest`, and the controller do not change.

Step four, green: the unit test passes with the fake, the feature test passes against MySQL, `composer check` passes. Step five, the pull request: `composer format` in its own commit if it changed anything, the template filled in with the L2 id, and the failing-run reason in the description. That slice is three small production edits, two tests, and three documents, and that ratio is normal here.

## Writing the review

Comment with the requirement or the convention, not with taste: "L2-044 criterion one: this controller method runs a query" lands better than "move this". Prefer a request for a separate commit over a request to drop a reformat. When a design choice is being undone, link the design document. And when the tests are good, the artefacts are present, and `composer check` is green, approve; the gates exist so that review can spend its time on the design, not on formatting.

## Things to remember

First the artefacts and the commits, then the code in request order, then the tests, then the tooling. Each layer has a short, mechanical checklist, and the deliberate choices, string ids, one-statement updates, raw-attribute Resources, the committed connection, inline narrowing, exhaustive `match`, and a guarded `$fillable`, are not findings. A new slice is a requirement, a failing test with its reason, the smallest implementation, and a green check, and Larastan tells you every `match` the new enum case touches.

That is the series. You can read every file in `backend`, you know what each gate enforces, and you know what a good pull request here looks like. The next step is to pick a small requirement, write the failing test, and open one.
