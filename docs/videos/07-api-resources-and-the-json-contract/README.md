# 07 · API Resources and the JSON contract

> **Runtime:** ~8 min · **Audience:** senior .NET engineers who return DTOs and configure `System.Text.Json` · **Prerequisites:** videos 03 to 05

**Video:** [07-api-resources-and-the-json-contract.mp4](07-api-resources-and-the-json-contract.mp4) · [Slides](slides.html) · **Audio:** [07-api-resources-and-the-json-contract.mp3](07-api-resources-and-the-json-contract.mp3) · [Transcript](script.md)

## Why this video exists

The JSON contract is the only coupling between the Laravel API and the Angular SPA, and API Resources are where it is enforced. A .NET developer expects DTOs and serializer options; Laravel gives explicit `toArray` methods, a default `data` wrapper, and `with()` for `meta`. The timestamp handling in `TodoResource` is also a measured performance choice that a reviewer must understand before "simplifying" it.

## Learning objectives

By the end, the viewer can:

- Explain why controllers return Resources, never models.
- Read `TodoResource::toArray` and map every key to requirement L2-019.
- Explain the `iso()` string rewrite and compare it with `System.Text.Json` date output.
- Write a `ResourceCollection` with `with()` for `meta`, and a Resource over a plain list.
- Keep status codes and headers in the controller.
- Apply the `V1` versioning rule.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| What happens if a controller returns `$todo`? | Every attribute, snake_case, `deleted_at` included: a contract leak |
| Which keys does a todo have? | `id`, `title`, `completed`, `completedAt`, `createdAt`, `updatedAt`, in that order; a test asserts it |
| Why `getAttributes()` and a string rewrite? | Carbon casting per row is too slow for 500 rows (L2-038); stored strings are already UTC; output must end in `Z` |
| Where does `meta` come from? | `with()` on `TodoCollection` and `ClearedTodosResource` |
| Where do 201 and `Location` live? | In the controller, so the Resource is reusable |
| How is the API versioned? | Namespaces and routes under `V1`; breaking changes go to `V2` |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/app/Http/Resources/V1/TodoResource.php` | `toArray` and `iso` |
| `backend/tests/Feature/Api/V1/ListTodosTest.php` | The ISO 8601 regular expression and the exact-structure assertion |
| `backend/app/Http/Resources/V1/TodoCollection.php` | `$collects`, constructor, `with` |
| `backend/app/Http/Resources/V1/ClearedTodosResource.php` | A Resource over a list |
| `backend/app/Http/Controllers/Api/V1/TodoController.php` | `store` and `destroy` |
| `backend/app/Http/` tree | The `V1` namespaces |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:00 | Introduction | Scope and the five questions |
| 01:00-01:50 | Resources | Why a Resource and not the model |
| 01:50-04:20 | TodoResource | Keys, `completed`, the `iso` rewrite, serializer comparison |
| 04:20-06:30 | Collections | `TodoCollection`, `ClearedTodosResource`, controller responsibilities |
| 06:30-08:00 | Versioning | The `V1` rule and pitfalls |
| 08:00-08:50 | Recap | Things to remember and a preview of video 08 |

## Demo commands

```sh
cd backend
cat app/Http/Resources/V1/TodoResource.php
vendor/bin/pest tests/Feature/Api/V1/ListTodosTest.php
curl -s http://localhost:8000/api/v1/todos | head -c 600
curl -s -X DELETE http://localhost:8000/api/v1/todos/completed
```

## Pitfalls

- Returning models or model collections from controllers.
- Per-row Carbon formatting with the wrong offset format.
- Contract keys changed without spec and frontend updates.
- Missing `with()` on collections.
- Missing `@property` docblocks on Resources.

## References

- Laravel, API Resources: https://laravel.com/docs/eloquent-resources
- Laravel, resource collections and `with`: https://laravel.com/docs/eloquent-resources#adding-meta-data
- RFC 3339 / ISO 8601 timestamps: https://www.rfc-editor.org/rfc/rfc3339
- System.Text.Json, DateTime support: https://learn.microsoft.com/dotnet/standard/datetime/system-text-json-support
- REST API contract design: `docs/detailed-designs/api-platform/rest-api-contract/README.md`
