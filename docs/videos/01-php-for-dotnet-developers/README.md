# 01 · PHP 8.4 for .NET developers

> **Runtime:** ~12 min · **Audience:** senior .NET engineers (C#, EF Core, Clean Architecture, MediatR) new to PHP · **Prerequisites:** none; a checkout of this repository is useful for following along

**Video:** [01-php-for-dotnet-developers.mp4](01-php-for-dotnet-developers.mp4) · [Slides](slides.html) · **Audio:** [01-php-for-dotnet-developers.mp3](01-php-for-dotnet-developers.mp3) · [Transcript](script.md)

## Why this video exists

A .NET developer opening `backend/` for the first time meets a per-request execution model, a backslash namespace separator, docblock generics, and `declare(strict_types=1)` on every file. None of it is hard, but all of it is unfamiliar, and the rest of the series assumes it. This video maps modern PHP onto the C# features the viewer already knows, using only code from this repository.

## Learning objectives

By the end, the viewer can:

- Explain PHP's shared-nothing request lifecycle and how it differs from a Kestrel process.
- Explain how Composer and PSR-4 resolve `App\Actions\Todos\CreateTodo` to `app/Actions/Todos/CreateTodo.php`.
- State exactly what `declare(strict_types=1)` covers and why Larastan reads docblocks.
- Read `final readonly class`, backed enums, `match`, `?? throw`, closures with `use`, first-class callables, and named arguments as the C# features they correspond to.
- Avoid the five habits from C# that cause bugs in PHP.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| How does a PHP request run? | Empty memory per request, framework boots each time, statics do not persist, Octane exists but is not used here |
| What is PSR-4? | Namespace prefix to folder mapping in `composer.json`; the file path must match the namespace |
| What does `strict_types` do? | Disables scalar coercion for calls made from that file; it does not type arrays or shapes |
| Where are PHP's generics? | In docblocks (`list<string>`, `array{active: int, completed: int}`), checked by Larastan |
| What is a `readonly class` with promoted constructor? | A sealed record: property declared, assigned, and immutable in one line |
| Why `===`? | `==` juggles types; `match` is already strict |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `docs/videos/assets/screenshots/todo-mock.png` | The product the API serves |
| `backend/composer.json` | The `autoload.psr-4` map |
| `backend/app/Actions/Todos/CreateTodo.php` | `declare(strict_types=1)`, `final readonly class`, typed constant, promoted constructor |
| `backend/app/Repositories/TodoRepository.php` | Nullable return `?Todo`, docblock shape on `counts()` |
| `backend/app/Actions/Todos/ClearCompletedTodos.php` | `@return list<string>` docblock |
| `backend/app/Enums/TodoStatus.php` | Backed enum |
| `backend/app/Repositories/EloquentTodoRepository.php` | `match` in `list()`, closure with `use` and `attempts: 3` in `createWithinLimit()` |
| `backend/app/Actions/Todos/DeleteTodo.php` | `?? throw new TodoNotFound($id)` |
| `backend/app/Http/Requests/Api/V1/RestoreTodosRequest.php` | `strtolower(...)` first-class callable |
| `backend/database/migrations/2026_10_08_000000_create_todos_table.php` | Named argument `precision: 3` |
| `backend/app/Exceptions/ProblemDetailsRenderer.php` | Array literal with spread |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:20 | Introduction | What the series is, what this video covers, the four questions |
| 01:20-03:15 | Execution model | Shared-nothing vs Kestrel, consequences, Composer and PSR-4, the mental model |
| 03:15-05:20 | Types | `strict_types`, runtime-checked signatures, docblocks as generics |
| 05:20-08:10 | Classes and enums | Readonly classes vs records, backed enums, `match`, null handling, closures, named arguments |
| 08:10-09:30 | Syntax | Dollar variables, arrows and double colons, interpolation, arrays and the standard library |
| 09:30-11:00 | Pitfalls | Comparison, arrays as values, truthiness, static state, the limits of `strict_types` |
| 11:00-11:40 | Recap | Things to remember and a preview of video 02 |

## Demo commands

```sh
cd backend
grep -rn "declare(strict_types=1)" app | wc -l      # one per file
grep -n "psr-4" -A 5 composer.json
cat app/Actions/Todos/CreateTodo.php
cat app/Enums/TodoStatus.php
```

## Pitfalls

- Writing `==` or `!=`; use `===` and `!==`.
- Expecting an array passed to a function to be modified in place.
- Relying on truthiness of `""`, `"0"`, `[]`, or `0`.
- Keeping state in a static property and expecting it to survive the request.
- Treating a docblock as a comment; Larastan checks it and review reads it.

## References

- PHP manual, strict typing: https://www.php.net/manual/en/language.types.declarations.php#language.types.declarations.strict
- PHP manual, enumerations: https://www.php.net/manual/en/language.enumerations.php
- PHP manual, `match`: https://www.php.net/manual/en/control-structures.match.php
- PHP manual, readonly classes: https://www.php.net/manual/en/language.oop5.basic.php#language.oop5.basic.class.readonly
- PHP manual, first-class callable syntax: https://www.php.net/manual/en/functions.first_class_callable_syntax.php
- PSR-4 autoloading: https://www.php-fig.org/psr/psr-4/
- Composer: https://getcomposer.org/doc/
- Larastan: https://github.com/larastan/larastan
