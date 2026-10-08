# 12 · Reviewing a PHP pull request

> **Runtime:** ~10 min · **Audience:** senior .NET engineers who will review and author changes to the backend · **Prerequisites:** videos 01 to 11

**Video:** [12-reviewing-a-php-pull-request.mp4](12-reviewing-a-php-pull-request.mp4) · [Slides](slides.html) · **Audio:** [12-reviewing-a-php-pull-request.mp3](12-reviewing-a-php-pull-request.mp3) · [Transcript](script.md)

## Why this video exists

The series' goal is a senior .NET engineer who can code the PHP backend and review PHP pull requests with confidence. This capstone turns the previous eleven videos into a review procedure: the artefacts a pull request must carry, the order to read it in, a checklist per layer, the deliberate choices that must not be "fixed", and one feature slice built test-first from a requirement.

## Learning objectives

By the end, the viewer can:

- Check a pull request against the template and `AGENTS.md` before reading the diff.
- Review the backend in request order with a mechanical checklist per layer.
- Recognise the seven deliberate choices a .NET reviewer is tempted to undo, and cite the requirement for each.
- Build a slice from requirement to green `composer check`, using Larastan's exhaustiveness errors to find every `match` a new enum case touches.
- Write review comments that cite requirements and conventions.

## Key questions

| Question | What a strong answer includes |
| --- | --- |
| What must a behaviour change carry? | An L2 requirement, a detailed design, a mock if the UI changes, tests written first, green checks, separate formatting commits |
| In what order do you review? | Routes, Form Requests, controller, Actions, repository, model and migrations, Resources, renderer, commands, tests, specs |
| Why is the string id not a finding? | Actions own the not-found rule; restore and update differ on the same id |
| Why is the query-level update not a finding? | L2-043: concurrent patches apply in full |
| How does Larastan help when adding an enum case? | Every non-exhaustive `match` over the enum is reported, in the repository and the fake |
| What makes a good review comment? | The requirement id or the convention, and a link to the design when a choice is being undone |

## Code / assets on screen

| File | What to show |
| --- | --- |
| `.github/PULL_REQUEST_TEMPLATE.md` | The checklist |
| `backend/app/Enums/TodoStatus.php`, `backend/app/Models/Todo.php`, `backend/app/Repositories/EloquentTodoRepository.php` | The three edits of the worked slice (illustrative additions) |
| `AGENTS.md`, `docs/specs/L2.md` | The rules the checklist cites (mentioned) |

## Run sheet

| Time | Segment | Content |
| --- | --- | --- |
| 00:00-01:00 | Introduction | What the video delivers and the five questions |
| 01:00-02:20 | Before the code | The template, the artefacts rule, the commits |
| 02:20-05:40 | Per layer | Review order, HTTP, application and persistence, tests and tooling |
| 05:40-06:50 | Looks wrong, is right | Seven deliberate choices and their requirements |
| 06:50-09:20 | A worked slice | Artefacts, failing tests, three edits, Larastan, green, the pull request, writing the review |
| 09:20-10:10 | Recap | Things to remember and the series wrap-up |

## Demo commands

```sh
cat .github/PULL_REQUEST_TEMPLATE.md
cd backend
composer analyse        # after adding an enum case: every non-exhaustive match is reported
composer check
git log --oneline       # formatting commits separate from behaviour commits
```

## Pitfalls

- Reviewing the diff before the artefacts and commits.
- "Simplifying" a deliberate choice without reading the design.
- Approving a behaviour change with no L2 id.
- Accepting a test added after the implementation as ATDD.
- Review comments without a requirement or convention behind them.

## References

- `AGENTS.md` (repository root), `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`
- `docs/specs/L2.md`, `docs/detailed-designs/architecture/backend-layering/README.md`
- PHPStan, match exhaustiveness: https://phpstan.org/blog/bring-your-exceptions-under-control (background on PHPStan's control-flow analysis)
- Laravel, enums in validation: https://laravel.com/docs/validation#rule-enum
