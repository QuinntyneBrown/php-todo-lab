# php-todo-lab frontend

Angular SPA for php-todo-lab: standalone components, zoneless change detection, signals for state. It talks to the API only through relative `/api` URLs.

## Requirements

- Node.js LTS and npm

## Set up and run

```sh
npm install
npm start                     # http://localhost:4200, proxies /api to http://localhost:8000
```

Start the backend first (`php artisan serve` in `/backend`) to use real data. Unit tests never need it: they use `InMemoryTodoApi`.

## Check

| Command                | What it runs                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `npm run check`        | `lint`, `format:check`, `test`, then a production `build`; stops at the first failure |
| `npm run lint`         | angular-eslint (`ng lint`) and Stylelint                                              |
| `npm run format`       | Prettier, rewriting files                                                             |
| `npm run format:check` | Prettier in `--check` mode                                                            |
| `npm test`             | Vitest with Angular Testing Library                                                   |
| `npm run e2e`          | Playwright with axe-core, at widths 360 to 1280 px (starts `ng serve` itself)         |

Before the first `npm run e2e`, install the browser: `npx playwright install chromium`.

## Layout

Components call `TodoStore`; the store calls the `TodoApi` port; only `core/api` touches HTTP and RxJS. See `AGENTS.md` at the repository root for where each file belongs.
