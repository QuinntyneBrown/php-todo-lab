# 05 · The Eloquent model, migrations and factories

You have modelled entities in EF Core, configured them with `IEntityTypeConfiguration`, added global query filters for soft deletes, and generated migrations with the `dotnet ef` tool. This video shows the same concerns in Laravel: the `Todo` model, the one migration that creates its table, the factory that every test uses to build data, and the seeder. The important difference is a pattern, not a syntax: Eloquent is Active Record, so the model is both the entity and the mapper.

## What you will be able to answer

By the end you will be able to answer: what each trait and property on the `Todo` model does and what its EF Core equivalent is, how soft deletes and ULIDs work without any configuration class, why the model overrides two date methods, how a migration is written by hand and why it is the only way the schema changes, and how factories replace Bogus and test builders.

## The model as entity and mapper

Open `app/Models/Todo.php`. The class extends Laravel's `Model` and uses three traits. `HasFactory` connects the model to `TodoFactory`, with a docblock that tells Larastan which factory. `HasUlids` generates a ULID primary key when a row is created, so there is no identity column and no value generator configuration; the id is a twenty-six character string, which is why the tests assert a length of twenty-six. `SoftDeletes` adds a `deleted_at` column to the model's awareness: `delete` sets the timestamp instead of removing the row, every query excludes deleted rows by default, and `withTrashed`, `onlyTrashed`, `restore` and `forceDelete` give you the other side. In EF Core that is a global query filter on `DeletedAt` plus `IgnoreQueryFilters`, written by hand; here it is one trait.

Above the class is a docblock listing every property with its type. That block is for Larastan, not for humans. Eloquent reads attributes from an internal array through magic methods, so without the docblock the analyser cannot know that `$todo->title` is a string or that `$todo->completed_at` is a nullable immutable date. Treat it as the entity's property declarations: when a column is added, the docblock changes in the same commit.

Now the properties. `$dateFormat` is set to a format with milliseconds, so Eloquent keeps the precision of the `TIMESTAMP(3)` columns rather than truncating to seconds. `$fillable` lists `title` and `completed_at`, and the comment tells you why `id` is absent: `fillable` is the whitelist for mass assignment, the `create` and `update` calls that take arrays, and leaving `id` out means a client-supplied id can never reach the row. There is no EF Core equivalent because EF never binds request data to entities; Laravel's `create` from an array does, so the whitelist is the over-posting defence, and a pull request that adds `id` to it or switches to an empty `$guarded` has removed that defence.

The `casts` method maps the four timestamp columns to `immutable_datetime`, so reading them gives a `CarbonImmutable`, the immutable date type you would want in C# too. That is `HasConversion` for a value type. Requirement L2-045 names this cast explicitly.

## Dates, UTC, and a computed property

Two overridden methods follow, and they exist for one requirement: L2-043 says stored and returned timestamps are UTC even when the server runs in another time zone. `fromDateTime` is what Eloquent calls when writing a date; the override converts the value to UTC before formatting it, whatever PHP's default zone is. `asDateTime` is what Eloquent calls when reading; the override parses the stored string as UTC explicitly, because the database connection is configured at plus zero zero, and the comment notes it also spares a default-zone lookup per parse. The application time zone in `config/app.php` is also fixed to UTC. Three layers agree, and `UtcTimestampsTest` proves it by switching PHP to Tokyo time and checking the stored and returned values.

Then the computed property. `completed` is an `Attribute` accessor that returns whether `completed_at` is not null. It reads the raw attribute array directly, which avoids the cast cost, and it is read-only: there is no setter because `completed` is derived, never stored, which is requirement L2-019 criterion three. In C# this is a get-only property marked `NotMapped`. Note that the accessor name maps to the `completed` property, so `$todo->completed` works and the `TodoResource` uses it.

Last, the scopes. `scopeActive` and `scopeCompleted` are local query scopes: prefix a method with `scope`, take the query builder, add a clause, and callers can write `Todo::query()->active()`. They carry a `Builder` of `Todo` docblock so Larastan types the chain. These are your reusable `IQueryable` extension methods, and `TodoTest` exercises each one independently, including the fact that they exclude soft-deleted rows.

## The migration

Open the migration under `database/migrations`. The file name starts with a timestamp, which is how Laravel orders migrations, and it returns an anonymous class extending `Migration` with `up` and `down`. `up` creates the `todos` table through a `Blueprint`: charset `utf8mb4` and the MySQL eight collation, a `ulid` primary key, a `title` string of two hundred, a nullable `completed_at` timestamp with precision three, `timestamps` with precision three for `created_at` and `updated_at`, and `softDeletes` with precision three for `deleted_at`. Then two indexes, each with a comment naming the query it serves and the requirement id: one on `deleted_at`, `created_at`, `id` for the newest-first list, and one on `deleted_at`, `completed_at` for counts and bulk operations. `down` drops the table.

Compare this with EF Core. There, you change the entity and let `dotnet ef migrations add` generate the migration. Here, you write the migration and the model separately, and nothing checks that they agree except the tests and the analyser. That sounds worse until you notice the upside: the migration is the source of truth for the schema, it is readable, and a reviewer sees exactly which index was added and why. The repository's rule is that migrations are the only way the schema changes. To change a column, you add a new migration; you never edit one that has already run, for the same reasons you never edit an applied EF migration. `php artisan migrate` applies pending migrations and records them in a `migrations` table, and `migrate:rollback` runs `down`, which `TodoTest` proves round-trips.

## Factories and the seeder

Open `database/factories/TodoFactory.php`. It extends `Factory` of `Todo` and has a `definition` method returning the default attributes: a four-word sentence from the faker library with the trailing full stop removed, and a null `completed_at`. A `completed` method returns a state that sets `completed_at` to now. Usage reads like a builder: `Todo::factory()->completed()->count(3)->create()` inserts three completed todos; `Todo::factory()->create(['title' => 'Call mom'])` overrides one attribute. That is Bogus plus a test data builder, shipped with the ORM and typed through the `Factory` generic. Requirement L2-045 makes factories the only way tests create data, so a test that inserts with raw SQL or with `DB::table` is a review failure, and you will see that rule hold across the whole suite in video ten.

The seeder in `database/seeders/DatabaseSeeder.php` uses the same factory to insert five sample tasks, two completed, with staggered `created_at` values so the list shows a mix. `php artisan migrate --seed` runs it after the migrations, and `SeederTest` checks the result.

## Pitfalls

Adding `id` to `$fillable`, or replacing `$fillable` with an empty `$guarded`, which reopens mass assignment of the key. Forgetting the class docblock or the factory `@use` annotation, which Larastan reports immediately. Choosing the mutable `datetime` cast instead of `immutable_datetime`; this project standardises on immutable. Editing an applied migration instead of adding a new one. Writing test data with `DB::table` or SQL instead of a factory. And calling `delete` on a model without `SoftDeletes` and expecting a soft delete; the trait is what makes `delete` gentle.

## Things to remember

The model is entity and mapper: traits give you factories, ULIDs and soft deletes; the docblock gives Larastan the property types; `$fillable` is the over-posting whitelist and excludes `id`; casts make dates immutable. Two overrides pin every timestamp to UTC, and `completed` is derived, never stored. Scopes are your reusable query extensions. The migration is hand-written, ordered by timestamp, reversible, and the only way the schema changes. Factories are the only way tests create data.

Next, the Eloquent repository: queries through scopes, one-statement updates, transactions, locking reads, and the bulk operations.
