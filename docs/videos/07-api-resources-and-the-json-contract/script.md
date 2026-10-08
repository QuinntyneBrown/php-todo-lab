# 07 · API Resources and the JSON contract

In .NET you return a DTO from a controller and let `System.Text.Json` and a naming policy turn it into JSON. Laravel has API Resources: small classes that sit between a model and the response and decide exactly which keys appear, in which case, in which format. This video reads the three Resources in the backend, `TodoResource`, `TodoCollection`, and `ClearedTodosResource`, against the contract they implement, and compares them with DTOs, serializer options, and mappers.

## What you will be able to answer

By the end you will be able to answer: what an API Resource is and why the controller never returns a model, how the todo contract from requirement L2-019 is enforced key by key, why timestamps are rewritten as strings rather than formatted through Carbon, how the list and the clear-completed responses carry a `meta` object, and how the `V1` namespace supports versioning.

## Why a Resource and not the model

Eloquent models can serialise themselves. Return a `Todo` from a controller and Laravel will emit every attribute, with snake_case column names, including `deleted_at`. That is the contract leak you avoid in .NET by never returning entities. An API Resource is the explicit DTO step: a class whose `toArray` method returns the array that becomes JSON. Nothing reaches the client that `toArray` does not name, so the contract lives in one file per shape, exactly as requirement L2-019 asks: one Laravel API Resource, camelCase keys, no other fields.

In .NET terms, a Resource is a DTO record plus the mapping code, in one place, with no AutoMapper. There is no reflection-driven projection, which means a reviewer reads the mapping rather than trusting a profile.

## TodoResource, key by key

Open `app/Http/Resources/V1/TodoResource.php`. It extends `JsonResource`, and a docblock tells Larastan that `$this->resource` is a `Todo`. `toArray` returns six keys in a fixed order: `id`, `title`, `completed`, `completedAt`, `createdAt`, and `updatedAt`. `deletedAt` is absent, and `ListTodosTest` asserts the exact key list, so adding a key is a contract change that a test will flag.

Three details matter. First, `completed` comes from the model's accessor, the derived boolean from video five, so the Resource does not recompute the rule. Second, the three timestamps go through a private `iso` method, and the Resource reads the raw stored strings with `getAttributes` instead of the cast `CarbonImmutable` values. Read the comment: casting each timestamp through Carbon costs too much for a five hundred row list under the two-hundred-millisecond budget, and the stored strings are already UTC in the model's date format, so turning them into ISO 8601 is a string rewrite. The `iso` method replaces the space with a T and appends a Z, so a stored "2026-10-08 04:33:59.123" becomes "2026-10-08T04:33:59.123Z". That is a deliberate micro-optimisation justified by requirement L2-038, and the tests check the format with a regular expression ending in Z.

Compare that with `System.Text.Json`, where a `DateTime` with `Kind` set to `Utc` serialises with seven fractional digits and a Z, and a `DateTimeOffset` serialises with an offset. Here the format is pinned by hand to milliseconds and Z, which is what the Angular side parses, and the backend never relies on a serializer default.

Third, `null` handling: `completedAt` is null when the stored column is null, and the `iso` method returns null for a non-string, so an active todo serialises as `completed` false and `completedAt` null, which `ListTodosTest` checks.

## Collections and meta

A single Resource becomes `{"data": {...}}` because Laravel wraps resource responses in a `data` key by default. The list needs more: the contract's `meta` object with `active` and `completed` counts across every non-deleted todo. Open `TodoCollection`. It extends `ResourceCollection`, declares `$collects` as `TodoResource`, so each item is serialised by the Resource you just read, and takes the `TodoList` result record from the `ListTodos` Action in its constructor, passing the todos to the parent and keeping the counts. Its `with` method returns the `meta` array, and Laravel merges it beside `data`. `ListTodosTest` asserts the exact structure: `data` and `meta` with `active` and `completed`, nothing else.

The pattern to remember: when a collection response needs extra top-level members, write a `ResourceCollection` class with `with`. When it does not, `TodoResource::collection` is enough, which is what `restoreMany` in the controller uses.

`ClearedTodosResource` is the third shape. The clear-completed endpoint returns the deleted ids, so the client can undo, plus a count. The Resource's constructor takes the list of ids, `toArray` returns `ids`, and `with` adds `meta` with `deleted`. The response is `data` containing `ids`, and `meta` containing `deleted`, which `ClearCompletedTodosTest` asserts. Notice the docblock on the class: it tells Larastan that `$resource` is a list of strings, because the base class types it as mixed. Those docblocks are the price of a generic base class in PHP, and they are what let `composer analyse` pass at level eight.

## Status codes and headers belong to the controller

Resources decide the body. Status codes and headers stay in the controller, as video three showed: `store` calls `response` on the Resource, sets 201, and adds a `Location` header; `destroy` returns no content. That split mirrors `CreatedAtAction` and `NoContent` in .NET and keeps the Resource reusable across endpoints: the same `TodoResource` serves create, update, restore, and the list items.

## Versioning

Every Resource lives in `App\Http\Resources\V1`, every Form Request in `Requests\Api\V1`, and every route under `/api/v1`. The rule in `AGENTS.md` is that a breaking change to the contract means a new version, never an edit to v1. In practice that means a `V2` namespace with its own Resources and routes, and the old ones untouched. The Angular side mirrors the contract in `core/api/models`, so the two sides are coupled only by this JSON, which is why the keys and formats are tested so precisely.

## Pitfalls

Returning a model or a collection of models from a controller, which leaks snake_case columns and `deletedAt`. Calling `toIso8601String` on each row, which costs more and emits a plus zero zero offset rather than Z. Adding a key to `toArray` without updating the contract in the specs and the frontend models. Forgetting `with` on a collection and losing `meta`. And dropping the `@property` docblock on a Resource, which Larastan reports as access on mixed.

## Things to remember

A Resource is the DTO and the mapping in one explicit class, and the controller never returns a model. `TodoResource` names six camelCase keys, derives `completed` from the model, and rewrites UTC timestamps to ISO 8601 with a Z by string replacement for speed. `TodoCollection` and `ClearedTodosResource` add `meta` through `with`. Status codes and headers stay in the controller. Everything lives under `V1`, and a breaking change means `V2`.

Next, errors: how every failure on an API path becomes RFC 9457 problem details, compared with `IExceptionHandler` and `ProblemDetails` in ASP.NET Core.
