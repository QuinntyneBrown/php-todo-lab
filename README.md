# php-todo-lab

[![CI](https://github.com/QuinntyneBrown/php-todo-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/QuinntyneBrown/php-todo-lab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![PHP 8.4+](https://img.shields.io/badge/PHP-8.4%2B-777bb4.svg)
![Angular](https://img.shields.io/badge/Angular-22-dd0031.svg)

php-todo-lab is a small, full-stack to-do application built as a reference for
modern PHP and Angular practice. It pairs a Laravel JSON API with an Angular
single-page app, and holds both to a production bar for architecture, testing,
accessibility, and tooling.

The product is deliberately narrow, so the engineering is easy to see: one
screen, one list, and a handful of actions.

> [!IMPORTANT]
> php-todo-lab is a learning project. It is single-user, has no
> authentication, and is designed to run on your local machine only. Do not
> deploy it or expose it to the internet. See [SECURITY.md](SECURITY.md).

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Running the checks](#running-the-checks)
- [API overview](#api-overview)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [License](#license)

## Features

- Add, edit, complete, reopen, and delete tasks, with undo for deletions.
- Filter by all, active, or done, and clear completed tasks in one action.
- Responsive layout from 360 px upward, with light and dark themes.
- WCAG 2.2 AA accessibility, verified with axe-core in the end-to-end suite.
- A versioned REST API (`/api/v1`) with RFC 9457 problem details for every
  error.

Out of scope for v1: accounts, sharing, due dates, priorities, tags, search,
and offline sync. The full scope is in [docs/specs/L1.md](docs/specs/L1.md).

## Architecture

The repository contains two independent applications. They share no code; the
versioned HTTP contract is the only coupling between them.

| Tier | Directory | Stack |
| --- | --- | --- |
| API | [`backend/`](backend/README.md) | PHP 8.4, Laravel, Eloquent, MySQL 8.4, Pest, Larastan level 8, Pint |
| Web app | [`frontend/`](frontend/README.md) | Angular (standalone, zoneless, signals), Vitest, Playwright, axe-core, ESLint, Prettier |

Dependencies point inward on both sides:

- **Backend:** route → Form Request → controller → Action → repository
  interface → Eloquent repository → API Resource.
- **Frontend:** components → `TodoStore` (signals) → `TodoApi` port →
  `HttpTodoApi` adapter. Only `core/api` touches HTTP.

During development the Angular dev server proxies `/api` to the Laravel server,
so the frontend holds no hard-coded hosts and needs no CORS configuration.

## Getting started

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| PHP | 8.4 or later | Extensions: `pdo_mysql`, `mbstring`, `intl`, and `pcov` for the coverage gate |
| Composer | 2.x | |
| Node.js | Current LTS | Includes npm |
| MySQL | 8.4 | Install locally, or use the bundled Docker Compose file |

Docker is optional. If you don't want to install MySQL, `docker compose up -d`
starts MySQL only, with the `todo` and `todo_test` databases already created.

### Install and run

1. Clone the repository:

   ```sh
   git clone https://github.com/QuinntyneBrown/php-todo-lab.git
   cd php-todo-lab
   ```

2. Start MySQL (optional, if you don't have it installed locally):

   ```sh
   docker compose up -d
   ```

3. Set up and start the API on `http://localhost:8000`:

   ```sh
   cd backend
   cp .env.example .env
   composer install
   php artisan key:generate
   php artisan migrate --seed
   php artisan serve
   ```

4. In a second terminal, start the web app on `http://localhost:4200`:

   ```sh
   cd frontend
   npm install
   npm start
   ```

5. Open `http://localhost:4200` in your browser.

For tier-specific setup, such as creating the `todo_test` database on a local
MySQL install or running the scheduler, see the
[backend README](backend/README.md) and the
[frontend README](frontend/README.md).

## Running the checks

Each tier has a single `check` command that must pass before a change is
merged. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs both
in parallel on every pull request.

| Directory | Command | What it runs |
| --- | --- | --- |
| `backend/` | `composer check` | Pint, Larastan level 8, and Pest against MySQL |
| `backend/` | `composer format` | Pint, rewriting files |
| `frontend/` | `npm run check` | angular-eslint and Stylelint, Prettier, Vitest, and a production build |
| `frontend/` | `npm run format` | Prettier, rewriting files |
| `frontend/` | `npm run e2e` | Playwright and axe-core end-to-end suite |

Before the first end-to-end run, install the browser with
`npx playwright install chromium`.

## API overview

All endpoints are JSON and live under `/api/v1`. Resources use camelCase
fields, ULID identifiers, and ISO 8601 UTC timestamps.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/todos` | List tasks, optionally filtered by `status` |
| `POST` | `/todos` | Create a task |
| `PATCH` | `/todos/{id}` | Update the title or completion state |
| `DELETE` | `/todos/{id}` | Delete a task (soft delete) |
| `POST` | `/todos/{id}/restore` | Restore a deleted task |
| `DELETE` | `/todos/completed` | Delete all completed tasks |
| `POST` | `/todos/restore` | Restore several tasks by id |

The contract is defined in [docs/specs/L2.md](docs/specs/L2.md) (L2-018 to
L2-021). A breaking change requires a new API version; `v1` is never edited
incompatibly.

## Documentation

| Document | Description |
| --- | --- |
| [docs/specs/](docs/specs/) | Requirements: L1 (high level) and L2 (detailed, with acceptance criteria). The source of truth. |
| [docs/detailed-designs/](docs/detailed-designs/) | Detailed designs per subsystem and feature, with C4, class, and sequence diagrams. |
| [docs/mocks/](docs/mocks/README.md) | HTML mocks: the visual design target. Open `index.html` in a browser. |
| [docs/design-system/](docs/design-system/README.md) | Design tokens, foundations, components, and patterns extracted from the mocks. |
| [docs/videos/](docs/videos/README.md) | Narrated video series on the PHP backend for .NET developers, with transcripts and slides. |
| [AGENTS.md](AGENTS.md) | Repository layout and engineering conventions for contributors and coding agents. |

## Contributing

Contributions are welcome. This project follows a requirements-first,
acceptance test-driven workflow: every behaviour change starts with a
requirement, a detailed design, and a mock, and is then built in small slices
with a failing acceptance test written first.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open an issue or a pull
request. For help and questions, see [SUPPORT.md](SUPPORT.md).

## Code of conduct

This project has adopted the
[Contributor Covenant](https://www.contributor-covenant.org/), version 2.1.
By participating, you agree to uphold it. See
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

Please don't report security issues through public GitHub issues. See
[SECURITY.md](SECURITY.md) for how to report a vulnerability and for the
project's security scope.

## License

Copyright (c) 2026 Quinntyne Brown.

Licensed under the [MIT License](LICENSE).
