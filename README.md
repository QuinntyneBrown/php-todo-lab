# php-todo-lab

A deliberately small to-do app for learning PHP and Angular practice: a Laravel JSON API (`/backend`) and an Angular SPA (`/frontend`). It runs locally for a single user and has no authentication, so never expose it to the internet.

- Requirements: `docs/specs/L1.md`, `docs/specs/L2.md`
- Detailed designs: `docs/detailed-designs/`
- Design target: `docs/mocks/index.html` (open in a browser)
- How agents and contributors work here: `AGENTS.md`

## Prerequisites

PHP 8.4+ (with `pdo_mysql`, `mbstring`, `intl`, and `pcov` for the coverage gate), Composer 2, Node.js LTS, and MySQL 8.4. If you would rather not install MySQL, `docker compose up -d` starts MySQL only, with the `todo` and `todo_test` databases.

## Run it

```sh
docker compose up -d                       # optional: MySQL on localhost:3306

cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve                          # http://localhost:8000

cd ../frontend                             # in a second terminal
npm install
npm start                                  # http://localhost:4200
```

## Checks

| Where | Command | Runs |
| --- | --- | --- |
| `/backend` | `composer check` | Pint, Larastan level 8, Pest |
| `/backend` | `composer format` | Pint, rewriting files |
| `/frontend` | `npm run check` | angular-eslint and Stylelint, Prettier, Vitest, production build |
| `/frontend` | `npm run format` | Prettier, rewriting files |
| `/frontend` | `npm run e2e` | Playwright and axe-core end-to-end suite |

CI (`.github/workflows/ci.yml`) runs both `check` commands in parallel.
