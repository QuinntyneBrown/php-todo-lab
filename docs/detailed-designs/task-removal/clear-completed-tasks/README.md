# Clear completed tasks

## Overview

php-todo-lab is a single-screen to-do app for one local user. This feature lets the user remove every finished task with one action and recover them shortly afterwards.

Terms used in this document:

- **task** — item in the to-do list, called a todo in the API
- **completed task** — task whose `completedAt` timestamp is set
- **soft delete** — deletion that sets a `deleted_at` timestamp and keeps the row, so the todo can be restored
- **bulk operation** — server operation that changes a set of todos in one request
- **database transaction** — group of statements that either all take effect or none does
- **toast** — transient message at the bottom of the screen, here with an "Undo" button

The list toolbar holds a "Clear completed" button. Pressing it soft-deletes all completed todos through one request. A toast "n tasks cleared" with an "Undo" button follows, where n is the number of cleared tasks. "Undo" restores the same todos by id through a second request.

Both bulk operations run in one database transaction, so either all affected todos change or none does. When no completed task exists, the button is disabled.

## Description

The slice runs from the toolbar button to the `todos` table.

Frontend (Angular SPA):

- **"Clear completed" button** — control in the toolbar region. It is disabled and carries `aria-disabled="true"` when `completedCount` is 0. The toolbar markup, the filter and this button, lives in the template of `TodoPageComponent`, so no separate presentational component renders it.
- **`TodoPageComponent`** — smart component. It handles the click and the `undone` event from the toast and calls `clearCompleted()` and `undo()` on the store.
- **`TodoStore`** — signal store. `completedCount` is computed from the `todos` signal. On clear, it keeps the completed todos, removes them from the `todos` signal, and sets the `toast` signal to a `ToastState` with `tone: 'status'`, the message "n tasks cleared", and `undo: { ids }`. The message for one task is "1 task cleared", as in the mock `docs/mocks/pages/notifications.html`. It uses the ids returned by the server for the restore request. On undo, it inserts the restored todos by `createdAt` descending, then `id` descending, and clears the toast.
- **`TodoListComponent`** — presentational component that renders `visibleTodos`.
- **`TodoEmptyStateComponent`** — presentational component. When the user clears on the "Done" filter, `visibleTodos` becomes empty and this component shows the empty state for that filter.
- **`ToastComponent`** — presentational component. It renders the message and the "Undo" button, and emits `undone`. A status toast uses `role="status"` and an error toast uses `role="alert"`.
- **`TodoApi`**, **`HttpTodoApi`**, **`InMemoryTodoApi`** — the port, the `HttpClient` adapter, and the test fake. This feature uses `clearCompleted(): Promise<ClearCompletedResponse>` and `restoreMany(ids: readonly string[]): Promise<Todo[]>`. Writes are never retried.
- **`UI_STRINGS`** in `src/app/features/todos/ui-strings.ts` — typed constants that hold the copy in the `toasts` and `announcements` groups.

Backend (Laravel API):

- **`TodoController`** — thin controller. `destroyCompleted` serves `DELETE /api/v1/todos/completed` and `restoreMany` serves `POST /api/v1/todos/restore`. `routes/api.php` registers both static routes before the `{todo}` routes, so `completed` and `restore` never match as ids.
- **`RestoreTodosRequest`** — form request that validates the body `{"ids": [ulid, ...]}`. `ids` is a required array of 1 to 500 items, and each item is a distinct ULID string.
- **`ClearCompletedTodos`** — action with one public method, `handle(): list<string>`. It soft-deletes all completed todos through `TodoRepository::deleteCompleted` and returns the deleted ids.
- **`RestoreTodos`** — action with one public method, `handle(list<string> $ids): Collection<int, Todo>`. It restores the todos for the given ids through `TodoRepository::restoreMany`.
- **`TodoRepository`**, **`EloquentTodoRepository`**, **`InMemoryTodoRepository`** — the interface, the Eloquent implementation, and the unit-test fake. Each bulk method of `EloquentTodoRepository` runs in one database transaction, so the actions stay free of Eloquent. The `completed()` scope on `Todo` selects the completed todos.
- **`Todo`** — Eloquent model with `SoftDeletes`.

The `DELETE` response is `200` with the body `{"data": {"ids": [...]}, "meta": {"deleted": n}}`. The restore response is `200` with the body `{"data": [todo, ...]}`, one `TodoResource` per restored todo.

The method names in the diagrams, `clearCompleted`, `restoreMany`, `deleteCompleted`, `destroyCompleted`, and `handle`, are the settled names.

Further decisions:

- The toast reads "1 task cleared" when n is 1 and "n tasks cleared" otherwise.
- The undo toast lasts 6 s, the same as the toast for a single deletion. The timer pauses while the toast has focus and restarts at the full 6 s when focus leaves. Ctrl/Cmd+Z triggers Undo while this toast is visible.
- When the clear request fails, the cleared rows reappear in the `todos` signal and the store shows the error toast "Couldn't clear completed tasks.".
- `POST /api/v1/todos/restore` restores the ids that are soft-deleted and ignores the others. The store inserts the todos the response returns and drops the rest without an error.
- When "Undo" is pressed while the clear request is still in flight, the store waits for that request to settle, then sends the restore request with the returned ids.
- When the restore request fails, the store shows the error toast "Couldn't restore those tasks.".

## Requirements

Acceptance criteria are cited by number in prose where the diagrams enforce them. The table is the requirement. For `L2-043`, only criterion 1 is in scope.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-017` | `L1-005` | A "Clear completed" button in the list toolbar shall soft-delete all completed todos through `DELETE /api/v1/todos/completed`, which returns `200` with `{"meta": {"deleted": n}}` and the deleted ids. A toast "n tasks cleared" with "Undo" shall appear, and "Undo" shall restore the todos through `POST /api/v1/todos/restore` with the ids. Clearing 3 completed among 5 tasks shall remove the 3 completed rows and keep the 2 active rows. With zero completed tasks, the button shall be disabled and shall have `aria-disabled="true"`. "Undo" shall return all cleared tasks. The bulk delete shall run in a single database transaction: either all complete or none. On the "Done" filter, clearing shall show the empty state for that filter. |
| `L2-043` | `L1-012` | The bulk operations (clear completed, restore many) shall each run in one database transaction. |

## Diagrams

### System context

The user clears completed tasks and undoes the clearing in php-todo-lab. The system has no external systems.

![C4 system context for clearing completed tasks](diagrams/c4-context.png)

### Containers

The Angular SPA sends the bulk `DELETE` and restore requests to the Laravel API, which changes `deleted_at` in the MySQL database.

![C4 container view for clearing completed tasks](diagrams/c4-container.png)

### Components

In the SPA, the page calls the store, which supplies the list, the empty state, and the toast. In the API, the controller calls `ClearCompletedTodos` or `RestoreTodos`, and the repository runs each bulk operation in one transaction.

![C4 component view for clearing completed tasks](diagrams/c4-component.png)

### Class structure

`TodoStore` depends on the `TodoApi` abstraction. `ClearCompletedTodos` and `RestoreTodos` depend on the `TodoRepository` interface, which declares the bulk operations.

![Class diagram for clearing completed tasks](diagrams/class-structure.png)

### Behaviour — clear completed then undo

The store removes the completed rows and shows the toast, then the server soft-deletes the completed todos in one transaction (`L2-017`, `L2-043`). "Undo" sends the ids to the restore endpoint, which also runs in one transaction, and the todos return to the list.

![Sequence diagram for clearing completed tasks and undoing it](diagrams/sequence-clear-completed-and-undo.png)

### Behaviour — empty and disabled state

With no completed tasks, `completedCount` is 0 and the button is disabled with `aria-disabled="true"`. A click produces no event and no request.

![Sequence diagram for the disabled Clear completed button](diagrams/sequence-clear-completed-disabled.png)
