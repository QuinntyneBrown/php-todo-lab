# Accessible interface

## Overview

php-todo-lab is a single-screen to-do app for one user. Its browser interface is an Angular single-page application (SPA). This feature makes that interface usable with a keyboard, a screen reader, browser zoom, and other assistive technology, to the level of WCAG 2.2 AA.

**assistive technology** — software or hardware that helps a person with a disability use a computer, such as a screen reader

**landmark** — page region that assistive technology can list and jump to, such as `main`

**accessible name** — text that assistive technology reads for a control

**polite live region** — page element whose text changes are spoken by a screen reader after the current speech ends, without moving focus

**focus ring** — visible outline around the element that has keyboard focus

**toast** — short message that appears over the page after an action and can carry an "Undo" button

The feature has three concerns. Semantics and labels give each element a correct role and name. Contrast, focus, and zoom keep content perceivable and operable at 200% zoom. Live announcements and focus management tell assistive technology what changed and keep the keyboard position stable. The visual reference is the mock `docs/mocks/todo.html`, which already carries a polite live region with `aria-live="polite"` and the labels listed below.

## Description

The feature is a frontend-only slice. It touches the Angular SPA container and no other container.

- **`TodoPageComponent`** — smart component at route `/`. It renders the `main` landmark and hosts the polite live region. It handles the outputs of the presentational components, calls `TodoStore`, and writes announcement text to the live region. After a keyboard delete it chooses the focus target.
- **Polite live region** — page element with `aria-live="polite"`. The class that feeds it (for example Angular CDK `LiveAnnouncer`) is `<TO SUPPLY>`. It announces text from `UI_STRINGS`, such as "Task added" and "Task completed".
- **`TodoHeaderComponent`** — presentational component. It renders the only `h1`, which contains the date.
- **`TodoComposerComponent`** — presentational component. Its input has the label "New task", visible or programmatically associated. The mock uses a visually hidden `label`.
- **`TodoFilterComponent`** — presentational component. It renders a `role="group"` of buttons with `aria-pressed`. The name of each button includes its count, for example "Active 2".
- **`TodoListComponent`** — presentational component. It renders a `ul` with one `li` per task.
- **`TodoItemComponent`** — presentational component for one row. Its checkbox is a native `input[type=checkbox]` whose accessible name equals the task title. Its icon-only buttons carry an `aria-label` that includes the title, such as "Delete Call mom". The wording of the edit button label is `<TO SUPPLY>`. After edit mode ends by Enter or Escape, it returns focus to the title.
- **`ToastComponent`** — presentational component. It renders `role="alert"` for an error toast and `role="status"` for any other toast. It never takes focus. It emits `focusWithinChange` when focus enters or leaves the toast or its "Undo" button.
- **`TodoStore`** — root service. Signals `todos`, `filter`, `editingId`, and `toast` hold state. Computed values `activeCount`, `completedCount`, and `visibleTodos` supply the counts in filter names and the focus target list. The store pauses and resumes the toast dismiss timer on focus-within changes.
- **`UI_STRINGS`** — typed constants in `ui-strings.ts`. They hold announcement text and `aria-label` text.
- **`tokens.scss`** — design tokens as CSS custom properties. Light and dark sets under `prefers-color-scheme` satisfy the contrast ratios, and the focus ring is defined once.

Details that this design leaves open:

- The element inside the target row that receives focus after a keyboard delete is `<TO SUPPLY>`.
- The mechanism that moves focus from `TodoPageComponent` to a presentational component, given that presentational components use `input()` and `output()` only, is `<TO SUPPLY>`.
- The timing of an announcement relative to server confirmation, and whether a rollback retracts it, is `<TO SUPPLY>`.
- Announcement text for edit, reopen, and delete is not fixed by L2-031 beyond "Task added" and "Task completed". The mock uses "Task updated", "Task reopened", and "Task deleted".
- After the toast loses focus, whether the dismiss timer restarts at 6 seconds or resumes the remainder is `<TO SUPPLY>`.

Contrast values are token-level decisions. Text meets 4.5:1 against its background, and text of 24 px or larger and UI component boundaries meet 3:1, in both themes. The focus ring is 2 px wide with at least 3:1 contrast and a 2 px offset. Completed tasks show a check and a strike-through in addition to the colour change. An automated axe-core scan of the loaded, empty, loading, error, editing, and toast-visible states reports zero violations.

## Requirements

The feature realizes the following level-2 (L2) requirements. Each L2 requirement refines a level-1 (L1) requirement, cited by identifier.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-029` | `L1-009` | The page shall have one `h1` (the date), a `main` landmark, and a task list that is a `ul` with `li` items. Each checkbox shall be a native `input[type=checkbox]` with an accessible name equal to the task title. The composer input shall have a visible or programmatically associated label "New task". The filter control shall be a `role="group"` of buttons with `aria-pressed`, or a radio group, and each option's name shall include its count. Icon-only buttons (delete, edit) shall each have an `aria-label` that includes the task title, for example "Delete Call mom". |
| `L2-030` | `L1-009` | Text contrast against its background shall be at least 4.5:1 (3:1 for text of 24 px or larger and for UI component boundaries) in both themes. Every interactive element that receives keyboard focus shall show a visible 2 px focus ring with at least 3:1 contrast and a 2 px offset. At 200% browser zoom all functionality shall remain available and no content shall be clipped. With text-spacing overrides (line height 1.5, letter spacing 0.12em) no content shall be lost or overlapped. An automated axe-core scan of every state (loaded, empty, loading, error, editing, toast visible) shall report zero violations. Colour shall never be the only indicator of state: completed tasks shall also show a check and a strike-through. |
| `L2-031` | `L1-009` | When a task is added, completed, reopened, edited, or deleted, a polite live region shall announce it ("Task added", "Task completed", and so on). An error toast shall be announced with `role="alert"`, and non-error toasts shall use `role="status"`. When a task is deleted by keyboard, focus shall move to the next row, or the previous row if the deleted row was last, or the composer if the list is empty. When edit mode ends by Enter or Escape, focus shall return to the row's title. The undo toast shall not steal focus and shall not auto-dismiss while it or its Undo button has focus. |

## Diagrams

### System context

The user reaches php-todo-lab through a browser and assistive technology. No external system takes part in this feature.

![C4 system context for the accessible interface](diagrams/c4-context.png)

### Containers

Only the Angular SPA takes part, because semantics, focus, and announcements run in the browser. The Laravel API and the MySQL database are not involved. For this slice the container view and the context view carry near-identical information.

![C4 container view for the accessible interface](diagrams/c4-container.png)

### Components

`TodoPageComponent` hosts the presentational components and the polite live region. `TodoItemComponent` and `ToastComponent` carry most of the semantic and focus behaviour. `UI_STRINGS` and `tokens.scss` supply text and visual tokens.

![C4 component view for the accessible interface](diagrams/c4-component.png)

### Class structure

`TodoPageComponent` composes the presentational components, calls `TodoStore`, and writes to the polite live region. `TodoStore` holds the `ToastState` that `ToastComponent` renders.

![Class diagram for the accessible interface](diagrams/class-structure.png)

### Behaviour — announce a task action

After an add, toggle, edit, or delete, `TodoPageComponent` reads the matching string from `UI_STRINGS` and writes it to the polite live region, as `L2-031` requires.

![Sequence diagram for announcing a task action](diagrams/sequence-announce-task-action.png)

### Behaviour — keyboard delete with focus movement

After a keyboard delete, `TodoPageComponent` moves focus to the next row, else the previous row, else the composer, per `L2-031`.

![Sequence diagram for keyboard delete focus movement](diagrams/sequence-keyboard-delete-focus.png)

### Behaviour — edit mode ending returns focus to the title

When edit mode ends by Enter or Escape, `TodoItemComponent` replaces the text field with the title and returns focus to the title, per `L2-031`.

![Sequence diagram for focus after edit mode ends](diagrams/sequence-edit-end-focus.png)

### Behaviour — toast roles and undo toast focus

`ToastComponent` renders `role="alert"` for an error toast and `role="status"` otherwise. The undo toast never takes focus, and the store pauses auto-dismiss while focus is inside the toast.

![Sequence diagram for toast roles and focus handling](diagrams/sequence-toast-roles-and-focus.png)
