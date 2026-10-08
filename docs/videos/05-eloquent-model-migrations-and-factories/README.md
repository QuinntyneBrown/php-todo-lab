# 05 · The Eloquent model, migrations and factories

> **Runtime:** ~10 min · **Audience:** senior .NET engineers who know EF Core entities, configurations, query filters, and migrations · **Prerequisites:** videos 01 to 04

**Video:** [05-eloquent-model-migrations-and-factories.mp4](05-eloquent-model-migrations-and-factories.mp4) · [Slides](slides.html) · **Audio:** [05-eloquent-model-migrations-and-factories.mp3](05-eloquent-model-migrations-and-factories.mp3) · [Transcript](script.md)

## Why this video exists

Eloquent is Active Record, and an EF Core developer will look for a configuration class and a generated migration that do not exist. This video reads the `Todo` model line by line, explains the UTC overrides and the derived `completed` property, shows the hand-written migration and why it is the only way the schema changes, and shows factories as the only way tests create data.

## Learning objectives

By the end, the viewer can:

- Explain `HasFactory`, `HasUlids`, and `SoftDeletes` and name their EF Core equivalents.
- Explain the class docblock, `$dateFormat`, `$fillable`, and `casts()`, and why `id` must stay out of `$fillable`.
- Explain the `fromDateTime` and `asDateTime` overrides and the three UTC layers.
- Write a local query scope and a derived `Attribute` accessor.
- Write a reversible migration with named indexes and a factory with a state.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| Where is the entity configuration? | On the model: traits, `$fillable`, `casts()`, scopes, and a docblock for Larastan |
| How do soft deletes work? | `SoftDeletes` stamps `deleted_at`; default queries exclude it; `withTrashed`, `onlyTrashed`, `restore`, `forceDelete` |
| Why is `id` not fillable? | Mass assignment from arrays would accept a client id (L2-021) |
| Why override `fromDateTime` and `asDateTime`? | Write as UTC and parse as UTC regardless of PHP's zone; the connection and app zone are also UTC (L2-043) |
| Is `completed` a column? | No: a get-only accessor derived from `completed_at` (L2-019) |
| How does the schema change? | Only through a new migration; never edit an applied one |
| How do tests create rows? | `Todo::factory()` with states and overrides, never SQL (L2-045) |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/app/Models/Todo.php` | Docblock, traits, `$dateFormat`, `$fillable`, `casts()`, `fromDateTime`, `asDateTime`, `completed()`, scopes |
| `backend/config/app.php`, `backend/config/database.php` | `timezone` settings (mentioned) |
| `backend/database/migrations/2026_10_08_000000_create_todos_table.php` | The full migration |
| `backend/database/factories/TodoFactory.php` | `definition()` and `completed()` |
| `backend/tests/Feature/Api/V1/ListTodosTest.php` | Factory usage |
| `backend/database/seeders/DatabaseSeeder.php` | The sample loop |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:05 | Introduction | Active Record versus Data Mapper, the five questions |
| 01:05-03:35 | Model | Traits, the docblock, `$fillable`, casts |
| 03:35-05:45 | Dates and scopes | UTC overrides, the derived accessor, the scopes |
| 05:45-07:35 | Migration | The migration and the comparison with `dotnet ef` |
| 07:35-09:25 | Factories | The factory, the seeder, pitfalls |
| 09:25-10:10 | Recap | Things to remember and a preview of video 06 |

## Demo commands

```sh
cd backend
cat app/Models/Todo.php
cat database/migrations/2026_10_08_000000_create_todos_table.php
php artisan migrate --seed
php artisan migrate:rollback
php artisan migrate
vendor/bin/pest tests/Feature/Models
```

## Pitfalls

- `id` in `$fillable` or an empty `$guarded`.
- Missing docblocks for Larastan.
- Mutable `datetime` casts.
- Editing an applied migration.
- Test data outside factories.
- Expecting a soft delete without the trait.

## References

- Laravel, Eloquent: https://laravel.com/docs/eloquent
- Laravel, soft deleting: https://laravel.com/docs/eloquent#soft-deleting
- Laravel, mass assignment: https://laravel.com/docs/eloquent#mass-assignment
- Laravel, accessors and casts: https://laravel.com/docs/eloquent-mutators
- Laravel, query scopes: https://laravel.com/docs/eloquent#query-scopes
- Laravel, migrations: https://laravel.com/docs/migrations
- Laravel, factories: https://laravel.com/docs/eloquent-factories
- EF Core, global query filters: https://learn.microsoft.com/ef/core/querying/filters
