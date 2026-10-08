# Edit task title

## Overview

php-todo-lab is a single-screen to-do app for one local user. Each task in the list has a title. This feature lets the user correct a title in place, without leaving the list.

Terms used in this document:

- **task** — item in the to-do list, called a todo in the API
- **edit mode** — state in which a row shows a text field instead of the static title
- **optimistic update** — change applied in the user interface before the server confirms it
- **rollback** — restoration of the previous state after the server rejects an optimistic update
- **no-op save** — save in which the trimmed text equals the stored title

The user starts editing by clicking the title, or by focusing it and pressing Enter. Enter or blur saves, and Escape cancels. A completed task is also editable. Only one task is in edit mode at a time.

The save is optimistic. The new title shows at once and the `PATCH` follows. A failure restores the previous title. A `404`, which means the task was deleted elsewhere, removes the row.

On the server, the same `PATCH` endpoint accepts a partial update. A title-only body leaves `completed` unchanged.

## Description

The slice runs from the title in a row to the `todos` table.

Frontend (Angular SPA):

- **`TodoItemComponent`** — presentational component for one row. It renders the title as a button with the `aria-label` "Edit <title>" and, in edit mode, a text field with the current value selected and focused. The field carries the `aria-label` "Edit task title", as in the mock `docs/mocks/pages/states.row.html`. Its inputs are `todo`, `editing`, and `focusRequest`. It trims the text on save and compares it with the stored title. It emits `editStarted`, `titleSaved` with the new title, or `editCancelled`. After it emits a save or a cancel, it ignores the blur that follows, so a single edit produces a single save. For an empty field, it restores the original title and shows "A task needs a title." below the field for 3 s. The message uses `role="alert"` and the field sets `aria-invalid="true"` while the message is visible, as in the mock.
- **`TodoPageComponent`** — smart component. It maps the item events to `beginEdit(id)`, `saveTitle(id, title)`, and `cancelEdit()` on the store. When an edit ends by Enter or Escape, it sets its `focusRequest` signal to `{ id, target: 'title', seq }`, and the item returns focus to the row's title button.
- **`TodoStore`** — signal store. It holds `editingId`, replaces the title in the `todos` signal optimistically, and keeps the previous title for rollback inside `saveTitle`. On a rejection with status `404`, it removes the row. On any other rejection, it restores the title. In both cases it sets the `toast` signal.
- **`ToastComponent`** — presentational component. It renders the error toasts "Couldn't save that change." and "That task no longer exists." with `role="alert"`.
- **`TodoApi`**, **`HttpTodoApi`**, **`InMemoryTodoApi`** — the port, the `HttpClient` adapter, and the test fake. The port method is `update(id: string, changes: UpdateTodoPayload): Promise<Todo>`. `HttpTodoApi` converts each failure to an `ApiError` with `kind`, `status`, and the parsed `problem` body, so that the store can recognise `404`.
- **`UI_STRINGS`** in `src/app/features/todos/ui-strings.ts` — typed constants that hold the copy in the `toasts`, `errors`, and `ariaLabels` groups.

Backend (Laravel API):

- **`TodoController`** — thin controller whose `update` method serves `PATCH /api/v1/todos/{id}`. The route parameter uses `whereUlid`, so a malformed id is a `404` from routing and never reaches the controller.
- **`UpdateTodoRequest`** — form request. It validates `title` as a string of at most 200 characters, and it rejects an empty body `{}` with `422`. It exposes only `title` and `completed`, so `id`, `createdAt`, `deletedAt`, and unknown fields are ignored.
- **`UpdateTodo`** — action with a single public method, `handle(string $id, array $changes): Todo`. It loads the non-deleted todo through `TodoRepository::find`, applies only the fields present, and calls `TodoRepository::update`, which issues one `UPDATE` statement. The last write wins per field. When no todo matches, it throws `TodoNotFound` from `app/Exceptions`. `ProblemDetailsRenderer` renders that exception as a `404` `application/problem+json` response with `detail` "The requested resource was not found.".
- **`TodoRepository`**, **`EloquentTodoRepository`**, **`InMemoryTodoRepository`** — the interface, the Eloquent implementation, and the unit-test fake.
- **`Todo`** — Eloquent model with soft deletes, so a soft-deleted todo is not found.
- **`TodoResource`** — serialises the updated todo.

The method names in the diagrams, `beginEdit`, `saveTitle`, `cancelEdit`, `update`, `find`, and `handle`, are the settled names.

Further decisions:

- Edit mode does not end after a rejected empty save. The field shows the original title, keeps focus, and shows the message.
- A blur on an empty field cancels the edit. The original title is shown and no request is sent. The mock refocuses the field on such a blur instead; the design cancels, so that the field never traps focus.
- `whereUlid` on the route maps a malformed id to `404` before any lookup.
- A `422` response to a title save is treated like any other failed save. The store restores the previous title and shows the toast "Couldn't save that change.". The client limits the title to 200 characters, so the response arises only from a direct request.

## Requirements

Acceptance criteria are cited by number in prose where the diagrams enforce them. The table is the requirement.

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-012` | `L1-004` | The user shall activate editing by clicking the title, or by focusing it and pressing Enter. The title shall become a text field with the current value selected. Enter or blur shall save and Escape shall cancel. Saving shall call `PATCH /api/v1/todos/{id}` with `{"title": string}`. The title shall update optimistically. A completed task shall also be editable. Only one task shall be in edit mode at a time, and beginning another edit shall save the first, or cancel it when unchanged. |
| `L2-013` | `L1-004` | Saving an unchanged title after trimming shall send no request. Clearing the field and pressing Enter shall restore the original title, show "A task needs a title." briefly, and send no request. The server shall return `422` for a 201-character title. When the `PATCH` fails, the previous title shall be restored and the toast "Couldn't save that change." shall be shown. |
| `L2-014` | `L1-004` | `PATCH` shall accept any non-empty subset of `title` and `completed`, ignore unknown fields, and apply the last write. A body `{"title": "X"}` shall leave `completed` unchanged. An empty body `{}` shall return `422`. An id that does not exist, is soft-deleted, or is not a valid ULID shall return `404` with a problem-details body. When the UI patches a task deleted elsewhere, it shall remove the row and show the toast "That task no longer exists." A body containing `id`, `createdAt`, or `deletedAt` shall leave those fields unchanged. |

## Diagrams

### System context

The user edits task titles in php-todo-lab. The system has no external systems.

![C4 system context for editing a task title](diagrams/c4-context.png)

### Containers

The Angular SPA sends the title change as a `PATCH` to the Laravel API, which stores it in the MySQL database.

![C4 container view for editing a task title](diagrams/c4-container.png)

### Components

In the SPA, the item emits edit events, the page forwards them, and the store applies the change through the `TodoApi` port. In the API, the controller validates through `UpdateTodoRequest` and calls `UpdateTodo::handle`.

![C4 component view for editing a task title](diagrams/c4-component.png)

### Class structure

`TodoItemComponent` emits edit events that `TodoPageComponent` passes to `TodoStore`. `UpdateTodo` depends on the `TodoRepository` interface rather than on Eloquent.

![Class diagram for editing a task title](diagrams/class-structure.png)

### Behaviour — edit and save

The user enters edit mode, changes the title, and presses Enter or blurs. The store updates the title at once. The server applies only `title` (`L2-014`) and the response reconciles the task.

![Sequence diagram for editing and saving a task title](diagrams/sequence-edit-and-save.png)

### Behaviour — cancel, no-op, and empty title

Escape, an unchanged title, and an empty title all end without a request. The empty title also restores the original text and shows "A task needs a title." (`L2-013`).

![Sequence diagram for cancelling or ignoring an edit](diagrams/sequence-edit-cancel-and-no-op.png)

### Behaviour — save failure and missing task

A network error or `5xx` response restores the previous title and shows "Couldn't save that change." A `404` response removes the row and shows "That task no longer exists."

![Sequence diagram for a failed title save and a task deleted elsewhere](diagrams/sequence-edit-save-failure.png)
