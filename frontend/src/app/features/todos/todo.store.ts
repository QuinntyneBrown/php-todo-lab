import {
  Injectable,
  PendingTasks,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { ApiError } from '../../core/api/api-error';
import type { Todo, UpdateTodoPayload } from '../../core/api/models';
import { TodoApi } from '../../core/api/todo-api';
import type { ToastState } from '../../shared/ui/toast/toast-state';
import { UI_STRINGS } from './ui-strings';

/** A todo as the UI holds it: pending while its create is in flight (L2-004). */
export type TodoView = Todo & { readonly pending?: true };

/** The list filter, as it appears in the URL (`?filter=active|done`; nothing for all). */
export type TodoFilter = 'all' | 'active' | 'done';

/** Anything other than a known filter, including a missing one, means all (L2-006). */
export function parseFilter(value: string | null | undefined): TodoFilter {
  return value === 'active' || value === 'done' ? value : 'all';
}

/** How long a task that left the filter stays for its animation; the exit adds 250 ms. */
const LEAVE_AFTER_MS = 350;

/** The writes queued for one task, and what the server last confirmed for it. */
interface PatchQueue {
  tail: Promise<void>;
  pending: number;
  confirmed: Todo;
  failure: { readonly error: unknown; readonly message: string } | null;
}

/** Why an add did not stick, so the page can give the title back (L2-004). */
export type AddResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly title: string; readonly fieldError?: string };

/**
 * The single source of task state (L2-047). Reads go through `resource()` over the
 * TodoApi port rather than `httpResource`, which would bypass the port (L2-048).
 * Writes change the local copy first and roll back if the server refuses (L2-004).
 */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly api = inject(TodoApi);
  /** Writes count as pending work, so the app is not stable until they settle. */
  private readonly pendingTasks = inject(PendingTasks);
  private readonly listResource = resource({ loader: () => this.api.list() });

  /** The local copy that optimistic updates change; replaced by every fresh load. */
  readonly todos = linkedSignal<TodoView[]>(() =>
    this.listResource.hasValue() ? [...this.listResource.value().data] : [],
  );
  readonly toast = signal<ToastState | null>(null);

  /** The one task whose title is being edited (L2-012 criterion 6). */
  readonly editingId = signal<string | null>(null);

  /** The selected filter; the page writes it from the `?filter=` query parameter. */
  readonly filter = signal<TodoFilter>('all');

  /** Counted from the local copy, so they move with every optimistic change (L2-007). */
  readonly activeCount = computed(() => this.todos().filter((t) => !t.completed).length);
  readonly completedCount = computed(() => this.todos().filter((t) => t.completed).length);
  readonly totalCount = computed(() => this.todos().length);

  /**
   * Tasks that stopped matching the filter but stay a moment, so the completion animation
   * plays in place before the row leaves (L2-006 criterion 6).
   */
  private readonly leaving = signal<ReadonlySet<string>>(new Set());

  readonly visibleTodos = computed(() => {
    const filter = this.filter();
    const leaving = this.leaving();
    return filter === 'all'
      ? this.todos()
      : this.todos().filter((t) => t.completed === (filter === 'done') || leaving.has(t.id));
  });

  /** Each task's PATCHes run one after another, so they apply in order (L2-010). */
  private readonly patchQueues = new Map<string, PatchQueue>();

  /** Deleted tasks an Undo can still bring back, with whether their delete succeeded. */
  private readonly removed = new Map<string, { todo: TodoView; deleting: Promise<boolean> }>();

  readonly loading = computed(() => this.listResource.isLoading());
  readonly loadFailed = computed(() => this.listResource.status() === 'error');

  reload(): void {
    this.listResource.reload();
  }

  async add(title: string): Promise<AddResult> {
    const placeholder: TodoView = {
      id: `tmp-${crypto.randomUUID()}`,
      title,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pending: true,
    };
    this.todos.update((todos) => [placeholder, ...todos]);

    try {
      const created = await this.track(this.api.create(title));
      this.todos.update((todos) => todos.map((t) => (t.id === placeholder.id ? created : t)));
      return { ok: true };
    } catch (error) {
      this.todos.update((todos) => todos.filter((t) => t.id !== placeholder.id));
      const fieldError = error instanceof ApiError ? error.fieldError('title') : undefined;
      if (fieldError !== undefined) return { ok: false, title, fieldError };
      this.showError(UI_STRINGS.toasts.addFailed);
      return { ok: false, title };
    }
  }

  /** Completes or reopens a task at once; the server catches up (L2-009, L2-010). */
  toggle(id: string, completed: boolean): Promise<void> {
    const todo = this.todos().find((t) => t.id === id);
    if (!todo || todo.pending) return Promise.resolve();

    if (this.filter() !== 'all' && completed !== (this.filter() === 'done')) {
      this.leaving.update((ids) => new Set(ids).add(id));
      setTimeout(() => {
        this.leaving.update((ids) => new Set([...ids].filter((leavingId) => leavingId !== id)));
      }, LEAVE_AFTER_MS);
    }

    const completedAt = completed ? (todo.completedAt ?? new Date().toISOString()) : null;
    return this.patch(
      { ...todo, completed, completedAt },
      { completed },
      UI_STRINGS.toasts.updateFailed,
    );
  }

  beginEdit(id: string): void {
    this.editingId.set(id);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  /**
   * Ends editing and saves a changed title optimistically (L2-012). An unchanged title,
   * after trimming, sends nothing (L2-013). Returns whether a save was sent.
   */
  saveTitle(id: string, title: string): boolean {
    if (this.editingId() === id) this.editingId.set(null);
    const todo = this.todos().find((t) => t.id === id);
    const trimmed = title.trim();
    if (!todo || trimmed === '' || trimmed === todo.title) return false;
    void this.patch({ ...todo, title: trimmed }, { title: trimmed }, UI_STRINGS.toasts.saveFailed);
    return true;
  }

  /** Removes a task at once and offers Undo; a failed delete puts it back (L2-015). */
  async delete(id: string): Promise<void> {
    const todo = this.todos().find((t) => t.id === id);
    if (!todo || todo.pending) return;
    if (this.editingId() === id) this.editingId.set(null);
    this.todos.update((todos) => todos.filter((t) => t.id !== id));
    this.toast.set({ message: UI_STRINGS.toasts.deleted, tone: 'status', undo: { ids: [id] } });

    const deleting = this.track(this.api.delete(id)).then(
      () => true,
      () => false,
    );
    this.removed.set(id, { todo, deleting });
    if (!(await deleting)) {
      this.removed.delete(id);
      this.insert(todo);
      this.showError(UI_STRINGS.toasts.deleteFailed);
    }
  }

  /**
   * Brings back what the toast's Undo names, at once and in its original place. A delete
   * still in flight is waited for first; a failed restore removes the task again.
   */
  async undo(): Promise<void> {
    const ids = this.toast()?.undo?.ids ?? [];
    this.toast.set(null);
    const entries = ids.flatMap((id) => this.removed.get(id) ?? []);
    ids.forEach((id) => this.removed.delete(id));
    entries.forEach(({ todo }) => {
      this.insert(todo);
    });

    const settled = await Promise.all(entries.map(({ deleting }) => deleting));
    const restorable = entries.filter((_, i) => settled[i]).map(({ todo }) => todo.id);
    if (restorable.length === 0) return;
    try {
      await this.track<unknown>(
        restorable.length === 1 && restorable[0] !== undefined
          ? this.api.restore(restorable[0])
          : this.api.restoreMany(restorable),
      );
    } catch {
      this.todos.update((todos) => todos.filter((t) => !restorable.includes(t.id)));
      this.showError(
        restorable.length === 1
          ? UI_STRINGS.toasts.restoreFailed
          : UI_STRINGS.toasts.restoreManyFailed,
      );
    }
  }

  dismissToast(): void {
    this.toast.set(null);
  }

  /** Puts a task back where the server orders it: newest first, ties by id (L2-005). */
  private insert(todo: TodoView): void {
    this.todos.update((todos) =>
      todos.some((t) => t.id === todo.id)
        ? todos
        : [...todos, todo].sort(
            (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
          ),
    );
  }

  /**
   * Shows `optimistic` at once and queues the PATCH behind any earlier one for the task.
   * When the queue drains after a failure, the task settles on the last state the server
   * confirmed, so the UI never stays out of step with the data (L2-010, L1-012).
   */
  private patch(optimistic: TodoView, changes: UpdateTodoPayload, failMessage: string) {
    const current = this.todos().find((t) => t.id === optimistic.id);
    if (!current) return Promise.resolve();
    const queue = this.patchQueues.get(current.id) ?? {
      tail: Promise.resolve(),
      pending: 0,
      confirmed: current,
      failure: null,
    };
    this.patchQueues.set(current.id, queue);
    this.replace(optimistic);
    queue.pending += 1;

    queue.tail = queue.tail.then(async () => {
      try {
        queue.confirmed = await this.track(this.api.update(current.id, changes));
      } catch (error) {
        queue.failure = { error, message: failMessage };
      } finally {
        queue.pending -= 1;
        if (queue.pending === 0) this.settle(queue);
      }
    });
    return queue.tail;
  }

  private settle(queue: PatchQueue): void {
    const { id } = queue.confirmed;
    this.patchQueues.delete(id);
    const gone = queue.failure?.error instanceof ApiError && queue.failure.error.status === 404;
    if (gone) {
      // Deleted elsewhere: drop the row rather than show a task that no longer exists (L2-014).
      this.todos.update((todos) => todos.filter((t) => t.id !== id));
      this.showError(UI_STRINGS.toasts.gone);
      return;
    }
    this.replace(queue.confirmed);
    if (queue.failure) this.showError(queue.failure.message);
  }

  private replace(todo: TodoView): void {
    this.todos.update((todos) => todos.map((t) => (t.id === todo.id ? todo : t)));
  }

  /** Keeps the app unstable until a write settles, so nothing reads a half-done change. */
  private async track<T>(write: Promise<T>): Promise<T> {
    const done = this.pendingTasks.add();
    try {
      return await write;
    } finally {
      done();
    }
  }

  private showError(message: string): void {
    this.toast.set({ message, tone: 'error', undo: null });
  }
}
