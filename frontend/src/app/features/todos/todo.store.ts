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
import type { Todo } from '../../core/api/models';
import { TodoApi } from '../../core/api/todo-api';
import type { ToastState } from '../../shared/ui/toast/toast-state';
import { UI_STRINGS } from './ui-strings';

/** A todo as the UI holds it: pending while its create is in flight (L2-004). */
export type TodoView = Todo & { readonly pending?: true };

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

  /** Counted from the local copy, so they move with every optimistic change (L2-007). */
  readonly activeCount = computed(() => this.todos().filter((t) => !t.completed).length);
  readonly completedCount = computed(() => this.todos().filter((t) => t.completed).length);

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
