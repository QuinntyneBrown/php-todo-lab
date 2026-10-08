# Delete task

## Overview

php-todo-lab is a single-screen to-do app for one local user. This feature lets the user delete one task and recover from a mistake shortly afterwards.

Terms used in this document:

- **task** — item in the to-do list, called a todo in the API
- **soft delete** — deletion that sets a `deleted_at` timestamp and keeps the row, so the todo can be restored
- **restore** — reversal of a soft delete that returns the todo to the list
- **toast** — transient message at the bottom of the screen, here with an "Undo" button
- **optimistic update** — change applied in the user interface before the server confirms it
- **rollback** — restoration of the previous state after the server rejects an optimistic update

Deleting a task removes its row at once and shows the toast "Task deleted" with an "Undo" button for 6 seconds. The server soft-deletes the todo and returns `204`. When the user presses "Undo", the server restores the todo and the task returns at its original chronological position. It keeps its completed state and `completedAt`. When the toast expires, the deletion stands.

The scheduled purge of old soft-deleted todos belongs to another requirement and is outside this design.

## Description

The slice runs from the delete control in a row to the `todos` table.

Frontend (Angular SPA):

- **`TodoItemComponent`** — presentational component for one row. It renders the delete control and emits a `deleted` output.
- **`TodoListComponent`** — presentational component that renders the rows and forwards `deleted`. It plays the row exit so that the row collapses within 250 ms. The animation mechanism is `<TO SUPPLY>`.
- **`ToastComponent`** — presentational component. It renders the message and the "Undo" button, and emits `undone`. The toast is placed in the toast area, which is the last region of the page.
- **`TodoPageComponent`** — smart component. It maps `deleted` and `undone` to store calls. It also handles Ctrl+Z and Cmd+Z while the toast is visible.
- **`TodoStore`** — signal store. On delete, it keeps the removed todo and its position, removes it from the `todos` signal, and sets the `toast` signal to "Task deleted" with the todo as Undo target. It owns the 6 s timer. A second deletion replaces the toast value, so Undo applies to the latest deletion only. On undo, it inserts the restored todo by `createdAt` descending, then `id` descending, which is the list order. On a failed delete, it reinserts the todo and replaces the toast with "Couldn't delete that task."
- **`TodoApi`**, **`HttpTodoApi`**, **`InMemoryTodoApi`** — the port, the `HttpClient` adapter, and the test fake.
- **`UI_STRINGS`** in `ui-strings.ts` — typed constants that hold the copy.

Backend (Laravel API):

- **`TodoController`** — thin controller for `DELETE /api/v1/todos/{id}` and `POST /api/v1/todos/{id}/restore`.
- **`DeleteTodo`** — action that soft-deletes a non-deleted todo through `TodoRepository`.
- **`RestoreTodo`** — action that finds a soft-deleted todo through `TodoRepository` and restores it. When the todo was purged or was never deleted, it raises a not-found condition (type `<TO SUPPLY>`), which the exception handler renders as `404` problem details.
- **`TodoRepository`**, **`EloquentTodoRepository`**, **`InMemoryTodoRepository`** — the interface, the Eloquent implementation using `SoftDeletes`, and the unit-test fake.
- **`Todo`** — Eloquent model with `SoftDeletes`.
- **`TodoResource`** — serialises the restored todo.

Method names shown in the diagrams, such as `delete`, `undo`, `findDeleted`, and `restore`, are indicative. Final names are `<TO SUPPLY>`.

Open details:

- Whether the 6 s timer restarts when a second deletion replaces the toast: `<TO SUPPLY>`.
- UI treatment of a failed restore, including a `404` response: `<TO SUPPLY>`.
- Order of the restore request when the user presses "Undo" while the delete request is still in flight: `<TO SUPPLY>`.
- Mechanism that makes "Undo" reachable with Tab immediately after the delete action, given that the toast area is the last page region: `<TO SUPPLY>`.
- Response of `DELETE /api/v1/todos/{id}` for an unknown or already deleted id: `<TO SUPPLY>`.

## Requirements

Acceptance criteria are cited by number in prose where the diagrams enforce them. The table is the requirement.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-015` | `L1-005` | Each row shall have a delete control. Deleting shall call `DELETE /api/v1/todos/{id}`, which soft-deletes the todo and returns `204`. The row shall collapse within 250 ms and a toast "Task deleted" with an "Undo" button shall stay for 6 seconds. "Undo" shall call `POST /api/v1/todos/{id}/restore`, which returns `200` with the todo, and the task shall reappear in its original chronological position with its completed state and `completedAt`. When the toast is ignored for 6 seconds, it shall dismiss and the deletion shall stand. A restore request for a todo that was purged or never deleted shall return `404`. Deleting a second task while a toast is visible shall update the toast to the latest deletion, and Undo shall apply to that one only. For a keyboard user, "Undo" shall be reachable with Tab immediately after the delete action, and Ctrl/Cmd+Z shall trigger undo while the toast is visible. When the delete request fails, the row shall reappear and the toast "Couldn't delete that task." shall be shown. |

## Diagrams

### System context

The user deletes tasks and undoes deletions in php-todo-lab. The system has no external systems.

![C4 system context for deleting a task](diagrams/c4-context.png)

### Containers

The Angular SPA sends `DELETE` and restore requests to the Laravel API, which sets or clears `deleted_at` in the MySQL database.

![C4 container view for deleting a task](diagrams/c4-container.png)

### Components

In the SPA, the item and the toast raise events that the page routes to the store, which calls the `TodoApi` port. In the API, the controller invokes `DeleteTodo` or `RestoreTodo`, which use the repository.

![C4 component view for deleting a task](diagrams/c4-component.png)

### Class structure

`TodoStore` holds the `todos` and the `ToastState`, and depends on the `TodoApi` abstraction. `DeleteTodo` and `RestoreTodo` depend on the `TodoRepository` interface.

![Class diagram for deleting a task](diagrams/class-structure.png)

### Behaviour — delete then undo

The store removes the row and shows the toast before the `DELETE` completes. "Undo" then restores the todo, and the store inserts it at its original position.

![Sequence diagram for deleting a task and undoing it](diagrams/sequence-delete-and-undo.png)

### Behaviour — toast expiry

After 6 seconds without "Undo", the store clears the toast and the deletion stands.

![Sequence diagram for toast expiry after a deletion](diagrams/sequence-delete-toast-expiry.png)

### Behaviour — delete failure

When the `DELETE` fails, the store reinserts the todo at its original position and replaces the toast with "Couldn't delete that task."

![Sequence diagram for a failed deletion](diagrams/sequence-delete-failure.png)

### Behaviour — second deletion replaces the toast

Deleting task B while the toast for task A is visible replaces the toast value. "Undo" then targets task B only.

![Sequence diagram for replacing the toast on a second deletion](diagrams/sequence-delete-replace-toast.png)

### Behaviour — restore returns 404

A restore request for a todo that was purged or never deleted returns `404` problem details. The UI treatment of that failure is open.

![Sequence diagram for a restore request that returns 404](diagrams/sequence-restore-not-found.png)
