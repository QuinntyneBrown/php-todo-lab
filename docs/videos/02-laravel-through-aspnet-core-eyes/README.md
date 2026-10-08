# 02 · Laravel through ASP.NET Core eyes

> **Runtime:** ~10 min · **Audience:** senior .NET engineers who know `Program.cs`, `IServiceCollection`, and `appsettings.json` · **Prerequisites:** video 01

**Video:** [02-laravel-through-aspnet-core-eyes.mp4](02-laravel-through-aspnet-core-eyes.mp4) · [Slides](slides.html) · **Audio:** [02-laravel-through-aspnet-core-eyes.mp3](02-laravel-through-aspnet-core-eyes.mp3) · [Transcript](script.md)

## Why this video exists

Before reading any layer of the backend, a .NET developer needs to know where the application is composed, how dependencies get resolved, and where configuration comes from. Laravel answers each question differently from ASP.NET Core: one fluent bootstrap file, reflection-based auto-wiring with facades for infrastructure, and PHP arrays fed by `.env`. This video shows each answer in the repository's own files.

## Learning objectives

By the end, the viewer can:

- Trace a request from `public/index.php` through `bootstrap/app.php` to the router.
- Map `Application::configure`, `withRouting`, `withMiddleware`, and `withExceptions` onto `Program.cs`.
- Explain auto-wiring, the `$bindings` array in `AppServiceProvider`, and `bootstrap/providers.php`.
- Recognise facades and helpers as service location, and know where they are acceptable in this backend.
- Read `config/database.php` and `.env.example`, and state the `env()` rule.
- Run `composer check` and the everyday Artisan commands.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| Where is the composition root? | `bootstrap/app.php` builds the app; `AppServiceProvider` binds interfaces; `bootstrap/providers.php` lists providers |
| Why is `CreateTodo` never registered? | Concrete classes are auto-wired by reflection, including method parameters on controllers and commands |
| Are facades static? | No: proxies that resolve a container service; used in infrastructure here, never in Actions; `Log::spy()` makes them testable |
| Where does `/api` come from? | `withRouting(api: ...)` mounts the file under the `api` prefix; `Route::prefix('v1')` adds `v1` |
| Why never call `env()` in app code? | Cached configuration makes `env()` return null; read `config()` instead |
| What does `composer check` run? | `pint --test`, Larastan, then Pest with a 90% coverage gate and a separate performance group |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `backend/public/index.php` | Autoloader, application, `handleRequest` |
| `backend/bootstrap/app.php` | The fluent configure call |
| `backend/routes/api.php` | The `v1` prefix group (first two routes) |
| `backend/app/Http/Controllers/Api/V1/TodoController.php` | Method injection in `store` |
| `backend/app/Providers/AppServiceProvider.php` | `$bindings` |
| `backend/bootstrap/providers.php` | Provider list |
| `backend/app/Console/Commands/PurgeDeletedTodos.php` | `Log::info` facade call |
| `backend/tests/Feature/Console/PurgeDeletedTodosTest.php` | `Log::spy()` |
| `backend/config/database.php` | The `mysql` connection |
| `backend/.env.example` | App and database variables |
| `backend/composer.json` | The `scripts` block |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-00:55 | Introduction | What the video covers and the five questions |
| 00:55-02:30 | Bootstrap | `index.php`, `bootstrap/app.php` versus `Program.cs`, no `MapControllers` |
| 02:30-05:05 | Container | Auto-wiring, `$bindings`, facades, helpers |
| 05:05-06:05 | Layout | One project, folder conventions, what review must enforce |
| 06:05-07:25 | Configuration | `config/database.php`, `.env`, the `env()` rule |
| 07:25-09:10 | CLI | Artisan commands, Composer scripts, pitfalls |
| 09:10-10:00 | Recap | Things to remember and a preview of video 03 |

## Demo commands

```sh
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
composer check
```

## Pitfalls

- `env()` outside `config/` breaks once configuration is cached.
- A facade or `app()` inside an Action defeats the in-memory unit tests.
- New providers must be listed in `bootstrap/providers.php`.
- Editing `.env` has no effect while configuration is cached.

## References

- Laravel, request lifecycle: https://laravel.com/docs/lifecycle
- Laravel, service container: https://laravel.com/docs/container
- Laravel, service providers: https://laravel.com/docs/providers
- Laravel, facades: https://laravel.com/docs/facades
- Laravel, configuration: https://laravel.com/docs/configuration
- Laravel, Artisan console: https://laravel.com/docs/artisan
- Composer scripts: https://getcomposer.org/doc/articles/scripts.md
