# 02 · Laravel through ASP.NET Core eyes

You know what `Program.cs` does, you know what `IServiceCollection` is for, and you know where `appsettings.json` ends and user secrets begin. This video maps all of that onto Laravel, using the backend of php-todo-lab. As of October 2026 the backend runs Laravel 13 on PHP 8.4, and everything you see is the real bootstrap, the real provider, and the real configuration files from the `backend` folder.

## What you will be able to answer

By the end you will be able to answer: how a request travels from `public/index.php` to a controller, what `bootstrap/app.php` is and how it compares with `Program.cs`, how the service container resolves an interface and why most of the wiring is invisible, where configuration lives and why `env()` is only called in one kind of file, and which Artisan and Composer commands you will type every day.

## From index.php to a response

Every HTTP request into this API hits one file: `public/index.php`. It is short. It records a start time, checks for a maintenance file, requires Composer's autoloader, requires `bootstrap/app.php` to get an application instance, and calls `handleRequest` with the captured request. That is the whole front controller. Your web server, or `php artisan serve` during development, routes every path to it.

In ASP.NET Core terms, `index.php` is the generated `Main` that calls `WebApplication.CreateBuilder` and `app.Run`, and `bootstrap/app.php` is the body of your `Program.cs`. Open it. It is a single fluent expression. `Application::configure` with the base path is `CreateBuilder`. `withRouting` points at `routes/api.php` for HTTP routes and `routes/console.php` for scheduled commands; because the file is registered as the api routes file, Laravel mounts it under the `api` prefix automatically, which is why `Route::prefix('v1')` inside it yields `/api/v1`. `withMiddleware` is where you would add or reorder middleware, the way you call `app.Use` in the pipeline; this backend leaves it empty and relies on Laravel's defaults, which include the `TrimStrings` and `ConvertEmptyStringsToNull` middleware that the Form Requests depend on. `withExceptions` registers the `ProblemDetailsRenderer`, which is the equivalent of `app.UseExceptionHandler` with a custom `IExceptionHandler`. Then `create` builds the application.

One difference to hold onto: there is no `builder.Services.AddControllers` and no `app.MapControllers`. Controllers are plain classes that the router instantiates by name, and the routes file names them explicitly. We walk the routes file in the next video.

## The service container

Laravel's container is the `IServiceCollection` and `IServiceProvider` rolled into one object, and most of the time you never touch it. It auto-wires by reflection: if a constructor or a method parameter is type-hinted with a concrete class, the container builds it, recursively, with no registration. That is why `TodoController` can declare a `CreateTodo` parameter on its `store` method and simply receive one. Method injection on controller actions and on Artisan commands is standard practice; in .NET you would reach for `[FromServices]`.

Registration is only needed for abstractions. Open `app/Providers/AppServiceProvider.php`. The entire class is a `$bindings` array that maps `TodoRepository`, the interface, to `EloquentTodoRepository`. That is `services.AddTransient` of the interface to the implementation. A sibling `$singletons` array would be `AddSingleton`. There is no scoped lifetime in the .NET sense because, as video one explained, the process is per request anyway, so a singleton effectively lives for one request under the traditional runtime. Service providers are the composition root, and `bootstrap/providers.php` lists the ones the application loads. Packages register their own providers through Composer package discovery, so you only list yours.

Now the part that reads as heresy to a .NET developer: facades. `DB::transaction`, `Log::info`, `Route::get`, `Schedule::command`, and `Schema::create` all look like static calls. They are not static classes. A facade is a thin proxy that resolves a service from the container and forwards the call. It is a service locator with a nice syntax. In this repository they appear in infrastructure code only: the repository uses the `DB` facade for transactions, the command uses `Log`, the routes and migrations use `Route` and `Schema`. The Actions never touch a facade; they take the repository interface in the constructor. Keep that boundary when you write code here. Facades are also testable: `PurgeDeletedTodosTest` calls `Log::spy` and asserts on what was logged, which is the Laravel equivalent of injecting a mock logger.

Alongside facades are global helper functions: `now()` returns the current time through a clock that tests can freeze, `url()` builds an absolute URL, `response()` builds a response, `config()` reads configuration, `collect()` wraps an array in a Collection, and `app()` resolves anything from the container. You will see `app(...)` in the tests that spawn concurrent processes. In production code, prefer constructor injection and treat `app()` the way you treat `IServiceProvider.GetRequiredService`: a smell outside the composition root.

## One project, many folders

A Clean Architecture solution in .NET uses project references to enforce that Domain cannot see Infrastructure. Laravel is one project. The layering in this backend, controller to Action to repository interface to Eloquent, is a convention held by three things: the folder layout in `AGENTS.md`, Larastan's type checking, and code review. Nothing stops an Action from importing the `Todo` model and calling a query. Only the reviewer does. That is the single biggest mindset shift for a .NET architect reviewing PHP, and it is why video twelve spends most of its time on review.

The folders you will live in are `app`, which holds Actions, Console commands, Enums, Exceptions, the HTTP layer, Models, Providers and Repositories; `bootstrap`, the application factory; `config`; `database`, with migrations, factories and seeders; `routes`; and `tests`. `public` is the web root, and `storage` is writable scratch space for logs and caches, ignored by git.

## Configuration and the environment

Configuration lives in `config`, as PHP files that return arrays. `config/database.php` is the one you care about: the `mysql` connection reads host, port, database name and credentials from the environment, sets the charset to `utf8mb4`, turns on strict mode, and fixes the session time zone to `+00:00` so every stored timestamp is UTC whatever the server's zone is. Code reads a value with the `config()` helper and a dotted key, for example `config('database.connections.mysql')`, which `TodoLimitTest` uses to clone the connection. That dotted path is your `IConfiguration` section path.

The environment comes from a `.env` file, which is never committed; `.env.example` is the committed template, the way you would commit an `appsettings.json` and keep the secrets in user secrets. `php artisan key:generate` fills in `APP_KEY`, which Laravel uses for encryption and signing. The rule that matters in review: `env()` is called only inside `config` files, never in application code. In production the configuration is cached to a single file for speed, and after that `env()` returns null anywhere else. Read `config()`, never `env()`. The test suite sets its own values in `phpunit.xml`, including the `todo_test` database, so tests never touch your development data.

## Artisan and Composer

Artisan is the `dotnet` CLI of a Laravel app. The commands you need from the backend README are: `php artisan serve` to run the API on port eight thousand, `php artisan migrate --seed` to create the schema and sample data, `php artisan key:generate` once after copying the env file, `php artisan schedule:work` to run the scheduler locally, and `php artisan tinker` for a REPL, which the concurrency tests use to run an Action in a separate process. Your own commands, like `todos:purge-deleted`, are classes in `app/Console/Commands` and show up automatically.

Composer scripts are the project's task runner. `composer check` runs `format:check`, then `analyse`, then `test`, and stops at the first failure. `composer format` runs Pint. `composer analyse` runs Larastan. `composer test` clears the cached configuration, runs Pest with a ninety percent coverage gate on Actions and repositories, then runs the performance group separately without coverage instrumentation. One command, same as CI. That is `dotnet format`, the analysers, and `dotnet test` in one script, and you run it before every push.

## Pitfalls

Four to watch. Calling `env()` outside `config` works on your machine and breaks the moment configuration is cached. Using a facade or `app()` inside an Action breaks the dependency direction that makes the unit tests work without a database. Forgetting that a new provider must be listed in `bootstrap/providers.php`; package providers are discovered, yours are not. And editing `.env` and wondering why nothing changed: the test script clears the config cache for you, but a running `php artisan serve` reads the file at request time, so check whether you cached configuration.

## Things to remember

`public/index.php` is `Main`, `bootstrap/app.php` is `Program.cs`, and routes, middleware and exception rendering are configured in that one fluent call. The container auto-wires concrete classes and needs a provider binding only for interfaces, which `AppServiceProvider` does with a `$bindings` array. Facades and helpers are service location; fine in infrastructure, never in Actions. Config is arrays under `config`, read with `config()`, fed by `.env` through `env()` in config files only. And `composer check` is the one command that must pass.

Next, we follow a request through the routes file, a Form Request, and the thin controller, and compare it with attribute routing and model binding.
