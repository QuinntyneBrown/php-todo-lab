# Security policy

## Security scope

php-todo-lab is a learning project that is designed to run on a developer's
local machine. By design, it has:

- no authentication or authorisation,
- no multi-user support, and
- no hardening for deployment on a public network.

These are documented assumptions (see [docs/specs/L1.md](docs/specs/L1.md)),
not vulnerabilities. Never deploy php-todo-lab to a server or expose it to the
internet.

## Supported versions

Only the latest commit on the `main` branch receives fixes.

## Reporting a vulnerability

**Please don't report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Report them privately through
[GitHub private vulnerability reporting](https://github.com/QuinntyneBrown/php-todo-lab/security/advisories/new).

Examples of issues that are in scope include:

- a vulnerable dependency in `composer.lock` or `package-lock.json`,
- a flaw that lets a web page in the browser read or change local task data
  through the API, and
- a secret committed to the repository.

Please include as much of the following as you can:

- the type of issue,
- the affected files, with the branch or commit,
- step-by-step instructions to reproduce it,
- a proof of concept, if you have one, and
- the impact you believe the issue has.

You should receive an acknowledgement within 5 business days. We'll keep you
informed as we investigate and fix the issue, and we'll credit you in the
advisory unless you prefer to remain anonymous.
