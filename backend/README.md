# php-todo-lab backend

Laravel JSON API for php-todo-lab. Every route lives under `/api/v1`; every error is RFC 9457 problem details. See `docs/specs/L2.md` (L2-018 to L2-021) for the contract.

## Requirements

- PHP 8.4+ with `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `openssl`, `zip`, `curl`
- Composer 2
- MySQL 8.4 (installed locally, or `docker compose up -d` from the repository root)

## Set up

```sh
cp .env.example .env          # defaults match docker-compose.yml
composer install
php artisan key:generate
php artisan migrate --seed    # creates the schema and a few sample tasks
```

The Pest feature suite uses a separate `todo_test` database. `docker compose` creates it on first start; with a local MySQL, create it yourself:

```sql
CREATE DATABASE todo_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

## Run

```sh
php artisan serve             # http://localhost:8000
```

The Angular dev server proxies `/api` here, so no CORS configuration is needed.

## Check

| Command | What it runs |
| --- | --- |
| `composer check` | `format:check`, then `analyse`, then `test`; stops at the first failure |
| `composer format` | Laravel Pint, rewriting files |
| `composer format:check` | Pint in `--test` mode |
| `composer analyse` | Larastan at level 8 |
| `composer test` | Pest: feature tests over HTTP against MySQL, unit tests against the in-memory repository |

## Layout

Request flow: route, Form Request, `TodoController`, one Action, `TodoRepository` interface, `EloquentTodoRepository`, `TodoResource`. See `AGENTS.md` at the repository root for where each file belongs.
