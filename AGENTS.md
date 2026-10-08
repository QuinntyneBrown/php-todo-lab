# AGENTS.md

`php-todo-lab` is a quick full-stack to-do app for learning PHP coding practices. PHP backend, Angular frontend.

## Incremental Implementation and ATDD - mandatory

Mocks and the design system are design artifacts. ATDD does not apply to their
development. Do not write tests for mocks or the design system.

Every new feature or change to production behavior MUST have a requirement, a
detailed design, and a mock before implementation begins. This includes
behavioral changes to existing features, such as changing how a page behaves.
This requirement applies to production-code changes only; documentation-only,
design-system-only, mock-only, and test-only changes are out of scope unless
they are part of implementing a production behavior change.

Every production behavior implementation MUST invoke and follow the
`incremental-implementation` skill (`.claude/skills/incremental-implementation`
and `.agents/skills/incremental-implementation`) before any code is written,
combined with acceptance test-driven development (ATDD). Plan small,
reviewable slices, then complete one slice at a time: write Given-When-Then
acceptance criteria, write the acceptance test, and run it to prove it fails for
the expected reason BEFORE writing production code. Implement only what satisfies
that slice, refactor with tests green, and run the relevant regression checks.
Do not move to the next slice until those checks pass. No bulk implementation,
no tests added afterward, and no weakening tests to manufacture a pass. Keep
the requirement, detailed design, mock, criteria, tests, and implementation
aligned until the entire feature or behavior change is complete.

### Never write architecture tests

Never add a test that asserts the shape of the codebase rather than its behavior:
no structure, layout, or naming tests; no banned-API scans; no traceability tests
that parse the specifications. Those constraints belong to the compiler, the
formatter, and review. A test suite exists to prove behavior.

## Repository structure

Two independent applications in one repository: a Laravel JSON API and an
Angular SPA. They share no code; the versioned HTTP contract (`/api/v1`, L2-018)
is the only coupling. New files go where this tree says; if something has no
home here, update this section in the same change.

```
php-todo-lab/
├── AGENTS.md  CLAUDE.md  GEMINI.md   Agent instructions (CLAUDE/GEMINI point here)
├── README.md                         Setup, run, and every check command (L2-054)
├── .editorconfig  .gitattributes     Shared whitespace and LF line endings
├── docker-compose.yml                Optional: MySQL 8.4 only, never the apps
├── docker/mysql/init/                SQL run on first start (creates `todo_test`)
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/ci.yml              backend and frontend jobs run `check` in parallel
├── docs/
│   ├── specs/                        L1.md, L2.md: requirements (source of truth)
│   ├── detailed-designs/<subsystem>/<feature>/   README.md + diagrams/
│   └── mocks/                        todo.html + styles/: design target, no tests
├── backend/                          Laravel API (PHP 8.4, strict_types everywhere)
│   ├── app/
│   │   ├── Actions/Todos/            One use case per class: CreateTodo, ListTodos, ...
│   │   ├── Enums/                    TodoStatus (backed enum)
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/   TodoController: thin, one Action per method
│   │   │   ├── Requests/Api/V1/      Form Requests: all validation lives here
│   │   │   └── Resources/V1/         TodoResource: all serialisation lives here
│   │   ├── Models/                   Todo (HasUlids, SoftDeletes, scopes)
│   │   ├── Repositories/             TodoRepository interface + EloquentTodoRepository
│   │   └── Providers/                AppServiceProvider binds interfaces
│   ├── bootstrap/app.php             Routing, middleware, RFC 9457 exception rendering
│   ├── config/  public/  storage/
│   ├── database/
│   │   ├── migrations/               The only way the schema changes
│   │   ├── factories/                The only way tests create data
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php                   `v1` prefix group; no closures, controllers only
│   │   └── console.php               Scheduled tasks (for example pruning)
│   ├── tests/
│   │   ├── Feature/Api/V1/           Pest HTTP tests against real MySQL, one file per endpoint
│   │   ├── Unit/Actions/             Pest unit tests with the in-memory fake
│   │   ├── Fakes/                    InMemoryTodoRepository
│   │   └── Pest.php
│   ├── .env.example                  Committed; `.env` never is
│   ├── composer.json                 `check`, `format`, `format:check`, `analyse`, `test`
│   ├── phpstan.neon                  Larastan level 8
│   ├── phpunit.xml  pint.json
│   └── README.md
└── frontend/                         Angular SPA (standalone, zoneless, signals)
    ├── src/
    │   ├── app/
    │   │   ├── core/                 App-wide singletons; nothing here imports features/
    │   │   │   └── api/              TodoApi port, HttpTodoApi adapter, models/ (only rxjs/HttpClient)
    │   │   ├── features/
    │   │   │   └── todos/
    │   │   │       ├── todo.store.ts             TodoStore (signals)
    │   │   │       ├── todo-page/                Smart component on route `/`
    │   │   │       └── components/               Presentational: todo-header/, todo-composer/,
    │   │   │                                     todo-filter/, todo-list/, todo-item/,
    │   │   │                                     todo-empty-state/
    │   │   ├── shared/ui/            Reusable presentational components (toast/)
    │   │   ├── app.config.ts         Providers, including TodoApi -> HttpTodoApi
    │   │   ├── app.routes.ts
    │   │   └── app.component.{ts,html,scss}
    │   ├── styles/                   tokens.scss (single source of design tokens)
    │   ├── testing/                  InMemoryTodoApi and other test-only helpers
    │   ├── styles.scss  index.html  main.ts
    ├── e2e/                          Playwright + axe specs and fixtures
    ├── angular.json  tsconfig*.json  eslint.config.js  .prettierrc.json  .stylelintrc.json
    ├── playwright.config.ts  vitest config
    ├── proxy.conf.json               /api -> http://localhost:8000 (no CORS)
    ├── package.json                  `check`, `lint`, `format`, `format:check`, `test`, `e2e`
    └── README.md
```

Every component lives in its own kebab-case folder with
`name.component.ts`, `.html`, `.scss`, and a colocated `name.component.spec.ts`.

### Full-stack conventions

- **Contract first.** The API contract in `docs/specs/L2.md` is defined before
  either side implements it. `TodoResource` and `core/api/models` mirror it
  exactly (camelCase JSON, ULID ids, ISO 8601 UTC timestamps).
- **Version the API.** Every route lives under `/api/v1`; a breaking change
  means a new version, never an edit to `v1`.
- **One error shape.** Every error is RFC 9457 problem details; the frontend
  handles failures in `HttpTodoApi` only, never in components.
- **Independent tiers.** Each tier has its own dependencies, lockfile
  (`composer.lock`, `package-lock.json`, both committed), README, and `check`
  command, and builds and tests without the other running. Frontend tests use
  `InMemoryTodoApi`; backend tests never need the SPA.
- **Configuration through environment.** Backend settings come from `.env`
  (template in `.env.example`); the frontend calls relative `/api` URLs and
  relies on the dev proxy, so it holds no hard-coded hosts and needs no CORS.
- **No secrets or generated output in git.** `.env`, `vendor/`, `node_modules/`,
  `dist/`, `.angular/`, `coverage/`, and test reports are ignored.
- **Dependencies point inward.** Backend: Controller -> Action -> Repository
  interface; Eloquent stays behind the repository. Frontend: components ->
  `TodoStore` -> `TodoApi` port; only `core/api` touches HTTP.

## Formatting and linting - mandatory

- Frontend: Prettier is the only formatter and angular-eslint is the linter
  (L2-055). Run `npm run format` and `npm run lint` in `/frontend` before
  committing; `npm run check` must pass.
- Backend: Laravel Pint with the `laravel` preset and `backend/pint.json` is the
  only PHP formatter (L2-056). Run `composer format` in `/backend` before
  committing; `composer check` must pass.
- Never hand-format around a formatter or disable a rule without naming it and
  giving a reason. Commit reformatting separately from behaviour changes.
- `.editorconfig` and `.gitattributes` (`eol=lf`) apply to the whole repository.
