import { Injectable, computed, inject, linkedSignal, resource } from '@angular/core';
import type { Todo } from '../../core/api/models';
import { TodoApi } from '../../core/api/todo-api';

/** A todo as the UI holds it: pending while its create is in flight (L2-004). */
export type TodoView = Todo & { readonly pending?: true };

/**
 * The single source of task state (L2-047). Reads go through `resource()` over the
 * TodoApi port rather than `httpResource`, which would bypass the port (L2-048).
 */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly api = inject(TodoApi);
  private readonly listResource = resource({ loader: () => this.api.list() });

  /** The local copy that optimistic updates change; replaced by every fresh load. */
  readonly todos = linkedSignal<TodoView[]>(() =>
    this.listResource.hasValue() ? [...this.listResource.value().data] : [],
  );

  readonly loading = computed(() => this.listResource.isLoading());
  readonly loadFailed = computed(() => this.listResource.status() === 'error');

  reload(): void {
    this.listResource.reload();
  }
}
