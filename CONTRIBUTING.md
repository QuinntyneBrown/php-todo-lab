# Contributing to php-todo-lab

Thank you for your interest in contributing. This guide explains how to report
issues, propose changes, and get a pull request merged.

By participating in this project, you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug.** Open an issue with the bug report template. Include steps
  to reproduce, what you expected, and what happened.
- **Suggest a feature.** Open an issue with the feature request template.
  php-todo-lab is deliberately small, so please check the out-of-scope list in
  [docs/specs/L1.md](docs/specs/L1.md) first.
- **Improve the documentation.** Fixes to READMEs, specs, and designs are
  always welcome.
- **Submit a code change.** Follow the workflow below.

For questions, see [SUPPORT.md](SUPPORT.md). To report a security issue, see
[SECURITY.md](SECURITY.md) instead of opening an issue.

## Before you start

For anything larger than a small fix, open an issue to discuss the change
before you write code. This helps avoid duplicate work and makes sure the
change fits the project's scope.

Read [AGENTS.md](AGENTS.md). It is the authoritative description of the
repository layout and the engineering conventions, for human contributors and
coding agents alike.

## Development setup

Follow [Getting started](README.md#getting-started) in the README to install
the prerequisites and run both tiers locally. Each tier also has its own
README:

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

## Development workflow

php-todo-lab uses a requirements-first, acceptance test-driven development
(ATDD) workflow.

### 1. Specify the change

Every new feature or change to production behaviour needs these artifacts
before implementation begins:

1. **A requirement** in [docs/specs/L2.md](docs/specs/L2.md), with
   Given-When-Then acceptance criteria, traced to an L1 requirement.
2. **A detailed design** in
   [docs/detailed-designs/](docs/detailed-designs/)`<subsystem>/<feature>/`.
3. **A mock** in [docs/mocks/](docs/mocks/README.md) for any user-facing
   change.

Documentation-only, mock-only, design-system-only, and test-only changes don't
need these artifacts.

### 2. Implement in small slices

Break the change into small, reviewable slices. For each slice:

1. Write the Given-When-Then acceptance criteria.
2. Write the acceptance test, and start the file with a header naming the
   requirement it covers, such as `// Traces to: L2-001`.
3. Run the test and confirm it fails for the expected reason.
4. Write only the production code needed to make it pass.
5. Refactor with the tests green.
6. Run the relevant checks before you start the next slice.

Don't add tests after the fact, and don't weaken a test to make it pass.

### 3. Test behaviour, not structure

Tests prove behaviour. Don't add tests that assert the shape of the codebase,
such as file layout, naming, banned APIs, or parsing the specs. Those
constraints are enforced by the compiler, the formatters, the linters, and
code review.

## Coding standards

### Backend (PHP)

- PHP 8.4 with `declare(strict_types=1)` in every file.
- Laravel Pint, configured by [backend/pint.json](backend/pint.json), is the
  only formatter. Run `composer format` before you commit.
- Larastan must pass at level 8.
- Keep controllers thin: one Action class per use case, validation in Form
  Requests, serialisation in API Resources, and Eloquent behind the
  repository interface.
- Create test data with factories, and change the schema only with
  migrations.

### Frontend (TypeScript and Angular)

- Standalone, zoneless components with `OnPush` change detection and signals
  for state.
- Every component lives in its own kebab-case folder with separate `.ts`,
  `.html`, and `.scss` files and a colocated `.spec.ts`.
- Prettier is the only formatter and angular-eslint is the linter. Run
  `npm run format` and `npm run lint` before you commit.
- Put every user-facing string in `ui-strings.ts`.
- Only `core/api` talks to HTTP. Components never handle API failures
  directly.

### Shared

- `.editorconfig` and `.gitattributes` (LF line endings) apply to the whole
  repository.
- Never hand-format around a formatter. If you disable a lint rule, name the
  rule and give the reason in a comment.
- Never commit secrets or generated output, such as `.env`, `vendor/`,
  `node_modules/`, or `dist/`.

## Running the checks

Both commands must pass before a pull request is merged:

```sh
cd backend && composer check
cd frontend && npm run check
```

If your change affects the user interface, also run the end-to-end suite:

```sh
cd frontend && npm run e2e
```

## Commits

- Write commit messages in the imperative mood, with a short summary line,
  such as `Add undo to bulk delete`.
- Keep each commit focused on one logical change.
- Commit formatting changes separately from behaviour changes.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change, following the workflow and standards above.
3. Make sure `composer check` and `npm run check` pass locally.
4. Open a pull request and complete the pull request template.
5. Link the issue the pull request resolves, and reference the L2
   requirements it implements.

A maintainer will review your pull request. Please respond to feedback by
pushing new commits to the same branch. Once the review is approved and CI
passes, a maintainer will merge it.

## License

By contributing to php-todo-lab, you agree that your contributions will be
licensed under the [MIT License](LICENSE).
