# 11 · Quality gates: Pint, Larastan and CI

> **Runtime:** ~8 min · **Audience:** senior .NET engineers who rely on `dotnet format`, Roslyn analysers, nullable reference types, and CI pipelines · **Prerequisites:** videos 01 and 10

**Video:** [11-quality-gates-pint-larastan-and-ci.mp4](11-quality-gates-pint-larastan-and-ci.mp4) · [Slides](slides.html) · **Audio:** [11-quality-gates-pint-larastan-and-ci.mp3](11-quality-gates-pint-larastan-and-ci.mp3) · [Transcript](script.md)

## Why this video exists

Without a compiler, the backend's correctness gates are tools and conventions: Pint, Larastan at level 8, `composer check`, and a CI job with a real MySQL service. A reviewer must know what each gate enforces, which annotations are load-bearing, and the two commit rules that keep formatting and behaviour apart.

## Learning objectives

By the end, the viewer can:

- Explain every line of `pint.json` and run `composer format` and `composer format:check`.
- Explain `phpstan.neon`, what level 8 reports, and why docblocks are checked code.
- Read a Larastan error and fix it with a guard rather than an ignore.
- Explain the order of `composer check` and the CI backend job.
- Explain `.editorconfig` and `.gitattributes` and the L2-056 line-ending rule.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| What does Pint add to the preset? | `declare_strict_types`, alphabetical `ordered_imports`, `no_unused_imports`, `fully_qualified_strict_types` |
| Why separate formatting commits? | A reformat must never hide a logic change (L2-056 criterion 6) |
| What is Larastan? | PHPStan with Laravel knowledge: builders, scopes, facades, model docblocks |
| What does level 8 catch? | Nullable access, nullable passed to non-null, wrong return shapes; docblock generics checked |
| Why no baseline? | L2-044 criterion 5: zero errors |
| What does CI run? | MySQL 8.4 service, PHP 8.4 with `pcov`, `composer install`, env setup, `composer check` |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/pint.json` | The whole file |
| `backend/phpstan.neon` | The whole file |
| `backend/app/Repositories/TodoRepository.php`, `EloquentTodoRepository.php`, `backend/database/factories/TodoFactory.php` | Load-bearing docblocks and the inline `@var` |
| `backend/app/Actions/Todos/DeleteTodo.php` | The guard that an illustrative Larastan error points to |
| `backend/composer.json` | The `check` script |
| `.github/workflows/ci.yml` | The backend job |
| `.editorconfig`, `.gitattributes` | Line endings and indentation |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:15 | Introduction | Three gates and the five questions |
| 01:15-02:55 | Pint | `pint.json`, the review rules |
| 02:55-05:30 | Larastan | `phpstan.neon`, load-bearing annotations, a failure and its fix |
| 05:30-08:05 | check and CI | `composer check`, `ci.yml`, editor and git settings, pitfalls |
| 08:05-08:50 | Recap | Things to remember and a preview of video 12 |

## Demo commands

```sh
cd backend
composer format
composer format:check
composer analyse
composer check
cat ../.github/workflows/ci.yml
```

## Pitfalls

- Ignore comments or baselines.
- Unnamed rule suppressions.
- Partial formatting runs.
- Mixed formatting and behaviour commits.
- Deleted docblocks.
- Nullable-access errors dismissed as noise.

## References

- Laravel Pint: https://laravel.com/docs/pint
- PHPStan rule levels: https://phpstan.org/user-guide/rule-levels
- PHPStan, PHPDoc types: https://phpstan.org/writing-php-code/phpdoc-types
- Larastan: https://github.com/larastan/larastan
- PER Coding Style: https://www.php-fig.org/per/coding-style/
- GitHub Actions, service containers: https://docs.github.com/actions/use-cases-and-examples/using-containerized-services/about-service-containers
- EditorConfig: https://editorconfig.org/
