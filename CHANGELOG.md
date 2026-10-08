# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Laravel JSON API under `/api/v1` for creating, listing, updating, deleting,
  and restoring tasks, with RFC 9457 problem details for every error.
- Angular single-page app with filters, inline editing, undoable deletion,
  clearing completed tasks, light and dark themes, and keyboard shortcuts.
- Hourly purge of soft-deleted tasks.
- Pest, Larastan, Pint, Vitest, ESLint, Prettier, Stylelint, Playwright, and
  axe-core checks, run in CI on every pull request.
- Requirements, detailed designs, HTML mocks, and a design system under
  `docs/`.

[Unreleased]: https://github.com/QuinntyneBrown/php-todo-lab/commits/main
