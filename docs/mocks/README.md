# Mocks

Static HTML design mocks for the one-screen to-do app. They are the design target for `docs/specs/L2.md` L2-001 to L2-031 and L2-042. Mocks are design artifacts: per `AGENTS.md`, they have no tests.

Open `index.html` in a browser (works from `file://`, no server needed). The launcher links every state and has a Light / Dark / Match system switch.

## What's here

```
index.html            launcher
todo.html             interactive prototype: add, complete, edit, delete and undo, filter, clear completed
app.js                mock-only helpers: ?theme= override, today's date, progress rings
styles/tokens.css     imports ../design-system/tokens/tokens.css (L2-026) and aliases the mock token names
styles/app.css        product styles, then mock-only galleries and launcher (marked)
pages/page.*.html     the screen in one state each
pages/states.*.html   specimen galleries for the composer, rows and toolbar
pages/notifications.html   every toast, banner, field message and screen reader announcement
```

| Group | Files |
| --- | --- |
| Screens | `page.loaded`, `page.loading`, `page.empty`, `page.all-done`, `page.load-error`, `page.offline`, `page.limit`, `page.long-titles`, `page.deleted` |
| Filters | `page.filter-active`, `page.filter-active.empty`, `page.filter-done`, `page.filter-done.empty` |
| Inline states | `states.composer`, `states.row` (including the completion animation frame by frame), `states.toolbar` |
| Notifications | `notifications` |
| Dialogs | None. L2-022 keeps the app to one screen with no modals; destructive actions are undone from a toast instead. |

Each page ends with a dashed **Mock** note listing the L2 criteria it covers.

## Conventions

- Naming: kebab-case, one extra dot per state (`page.filter-done.empty.html`).
- No `<style>` blocks or `style=""` attributes in pages; everything lives in `styles/`. Colours come only from tokens.
- State lives in ARIA and native attributes (`aria-pressed`, `aria-invalid`, `aria-disabled`, `checked`). Hover, focus and mid-animation frames in the galleries use mock-only classes (`is-hover`, `is-focus`, `is-focus-ring`, `frame-1`, `frame-2`) inside `.is-frozen`.
- `?theme=light|dark` is a review aid only. The product follows `prefers-color-scheme` with no toggle.
- Copy comes from L2 word for word and follows L2-025: sentence case, no exclamation marks, no apologies.

## Reviewing

Resize the window to check the breakpoints in L2-027 (575 / 576 / 768 / 992 px). Every page has been checked in Chromium at 320, 768 and 1280 px in both themes for horizontal overflow and console errors, and scanned with axe-core (WCAG 2.2 AA) with zero violations.
