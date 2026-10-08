# 11 · Quality gates: Pint, Larastan and CI

In .NET the compiler is your first reviewer, nullable reference types are your second, and analysers with warnings as errors are your third. PHP has no compiler step, so this backend builds the same three gates out of tools: Pint for formatting, Larastan at level eight for types, and `composer check` to run them with the tests, locally and in CI. This video reads the configuration of each, shows what they catch, and explains the review rules that go with them.

## What you will be able to answer

By the end you will be able to answer: what Pint enforces and why formatting commits are kept separate, what Larastan level eight checks and how docblocks feed it, what `composer check` runs and in which order, how the CI workflow reproduces it with a real MySQL service, and which editor and git settings keep the formatter stable across operating systems.

## Pint: one formatter, no debate

Open `backend/pint.json`. Pint is Laravel's wrapper around PHP-CS-Fixer, and this file is the whole configuration: the `laravel` preset, which is PSR-12 and the PER coding style with Laravel's conventions, plus four rules the project adds. `declare_strict_types` inserts the strict types declaration in every file, which is how requirement L2-044 criterion five is enforced without a test. `ordered_imports` sorts `use` statements alphabetically. `no_unused_imports` removes imports nothing references. `fully_qualified_strict_types` turns fully qualified class names in signatures into imports. The `exclude` list skips `bootstrap/cache`, `storage`, and `vendor`.

That is `dotnet format` with an `.editorconfig`, except that Pint also rewrites code, not only whitespace: it will add the strict types line and reorder your imports. Run `composer format` before committing and `composer format:check` to verify without writing; the check is the first step of `composer check`, so an unformatted file fails CI before anything else runs. Requirement L2-056 adds two review rules. A rule is never disabled without naming it and giving a reason, and formatting changes are committed separately from behaviour changes, so a diff that reformats a file is never hiding a logic change. When you review, a commit that mixes the two is a request for a split.

## Larastan: the type checker that reads docblocks

Open `backend/phpstan.neon`. It includes Larastan's extension, sets level eight, and lists the paths to analyse: `app`, `bootstrap/app.php`, `config`, `database`, `routes`, and `tests/Fakes`. Larastan is PHPStan with knowledge of Laravel: it understands that `Todo::query()` returns a builder of `Todo`, that a scope method exists because of `scopeActive`, that a facade forwards to a service, and that the model's docblock declares its attributes. PHPStan's levels run from zero to ten as of 2026; level eight is where calling a method on a possibly null value, passing a nullable where a non-null is expected, and returning the wrong shape all become errors. That is nullable reference types turned on with warnings as errors, plus generic checking of the docblock types from video one.

Watch how the code feeds it. `TodoRepository` declares `list` as returning a collection of int to `Todo`, and `counts` as returning an array shape. `TodoFactory` is annotated as extending a `Factory` of `Todo`, and the model's `HasFactory` trait carries a `use` annotation naming the factory. In `EloquentTodoRepository`, `deleteCompleted` has an inline `@var` comment declaring `$ids` as a list of strings, because `pluck` followed by `all` is typed as an array of mixed, and the interface promises a list of strings; the inline annotation narrows it where the code knows better than the analyser. Every one of those annotations is load-bearing. Remove the `@return` on `counts` and `ListTodos` fails to analyse, because `$counts['active']` is no longer known to be an int.

What does a failure look like? Suppose a change calls `find` and uses the result without the `?? throw` guard. Larastan reports something like "Cannot call method delete on `App\Models\Todo` or null", with the file and line. The fix is the guard, not an ignore comment. This project runs with zero errors and no baseline file, and the PHPStan baseline feature, which records existing errors to ignore, is deliberately absent: requirement L2-044 criterion five says Larastan passes with zero errors.

## composer check and CI

`composer check` is the one command. It runs `format:check`, then `analyse`, then `test`, and stops at the first failure, which is the cheapest-first order: Pint takes a second, Larastan a few seconds, the test suite a minute with MySQL. Run it before every push; the pull request template asks you to confirm you did.

Open `.github/workflows/ci.yml`. Two jobs run in parallel on every push to main and every pull request: `backend` and `frontend`. The backend job starts a MySQL 8.4 service container with the `todo_test` database and the `todo` user, with a health check so the job waits until MySQL answers. It installs PHP 8.4 with the `pdo_mysql`, `mbstring`, and `intl` extensions and `pcov` for coverage, runs `composer install`, copies `.env.example` to `.env`, generates the application key, and runs `composer check`. That is the same command you ran locally against the same database engine, so a green CI means your machine would have been green too. In .NET terms, the job is `dotnet format --verify-no-changes`, `dotnet build` with warnings as errors, and `dotnet test` against a SQL Server service container, in one script.

## Editor and git settings

Two root files keep the formatter stable across machines. `.editorconfig` sets UTF-8, LF line endings, trailing whitespace trimming, a final newline, and four-space indentation for PHP, as PSR-12 requires. `.gitattributes` normalises every text file to LF in the repository and the working tree, on every operating system, with explicit exceptions for Windows batch and PowerShell scripts. Requirement L2-056 explains why: Pint's `line_ending` rule would fail on a Windows checkout with `core.autocrlf` if git converted files to CRLF. If you develop on Windows, you never need to think about it, which is the point.

## Pitfalls

Adding an `ignore` comment or a baseline to make Larastan pass. Disabling a Pint rule without naming it and the reason. Running Pint on one file and pushing, when CI formats the whole tree. Mixing a reformat into a behaviour commit. Removing a docblock because "the code compiles"; nothing compiles, and the docblock is what Larastan checks. And treating a Larastan error on nullable access as noise; it is the same bug nullable reference types catch in C#, and the guard belongs in the code.

## Things to remember

Pint is the one formatter: the Laravel preset plus strict types, sorted imports, no unused imports, and qualified types turned into imports; format before you commit, and commit formatting separately. Larastan at level eight is your nullable and analyser gate, fed by docblocks that are mandatory and checked, with zero errors and no baseline. `composer check` runs format, analyse, test, cheapest first, and CI runs the same command against MySQL 8.4. `.editorconfig` and `.gitattributes` keep line endings and indentation stable everywhere.

Next, the last video: reviewing a PHP pull request in this repository, with a checklist built from everything in the series and a worked example of adding a feature slice.
