import { ApiError } from '../app/core/api/api-error';
import type {
  ClearCompletedResponse,
  Todo,
  TodoListResponse,
  UpdateTodoPayload,
} from '../app/core/api/models';
import { TodoApi } from '../app/core/api/todo-api';

export type Operation = keyof TodoApi;

interface StoredTodo extends Todo {
  readonly deleted: boolean;
}

/**
 * A TodoApi that keeps todos in memory and follows the server's rules (L2-048 criterion 3).
 * Tests can make any operation fail (`failNext`) or hold every response until released
 * (`hold`), to observe optimistic and rolled-back states.
 */
export class InMemoryTodoApi extends TodoApi {
  readonly calls: { operation: Operation; args: unknown[] }[] = [];
  private rows: StoredTodo[] = [];
  private clock = Date.parse('2026-01-01T00:00:00.000Z');
  private nextId = 1;
  private readonly failures: { operation: Operation; error: ApiError }[] = [];
  private gate: { promise: Promise<void>; operation?: Operation } | null = null;

  /** Adds todos oldest first, so the last title is the newest. */
  seed(...todos: (string | { title: string; completed?: boolean })[]): Todo[] {
    return todos.map((todo) => {
      const { title, completed = false } = typeof todo === 'string' ? { title: todo } : todo;
      const createdAt = this.tick();
      const row: StoredTodo = {
        id: this.newId(),
        title,
        completed,
        completedAt: completed ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
        deleted: false,
      };
      this.rows.push(row);
      return strip(row);
    });
  }

  /** Adds one todo and returns it. */
  seedOne(todo: string | { title: string; completed?: boolean }): Todo {
    const [seeded] = this.seed(todo);
    if (!seeded) throw new Error('seed returned nothing');
    return seeded;
  }

  /** The non-deleted todos as the server would list them. */
  get todos(): Todo[] {
    return this.live().map(strip);
  }

  /** The next call to `operation` rejects with `error` (default: a 500). */
  failNext(operation: Operation, error: ApiError = new ApiError('server', 500)): void {
    this.failures.push({ operation, error });
  }

  /** Holds every response, or only `operation`'s, until the returned function is called. */
  hold(operation?: Operation): () => void {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => (release = resolve));
    this.gate = operation ? { promise, operation } : { promise };
    return () => {
      this.gate = null;
      release();
    };
  }

  async list(): Promise<TodoListResponse> {
    await this.respond('list', []);
    const live = this.live();
    return {
      data: live.map(strip),
      meta: {
        active: live.filter((t) => !t.completed).length,
        completed: live.filter((t) => t.completed).length,
      },
    };
  }

  async create(title: string): Promise<Todo> {
    await this.respond('create', [title]);
    if (this.live().length >= 500) {
      const message = 'You have 500 tasks. Finish or delete some to add more.';
      throw new ApiError('client', 422, {
        type: 'about:blank',
        title: 'Unprocessable Content',
        status: 422,
        detail: message,
        code: 'todo_limit_reached',
        errors: { title: [message] },
      });
    }
    return this.seed(title.trim())[0] as Todo;
  }

  async update(id: string, changes: UpdateTodoPayload): Promise<Todo> {
    await this.respond('update', [id, changes]);
    const row = this.find(id, false);
    const completedAt =
      changes.completed === undefined
        ? row.completedAt
        : changes.completed
          ? (row.completedAt ?? this.tick())
          : null;
    return this.replace({
      ...row,
      title: changes.title ?? row.title,
      completed: completedAt !== null,
      completedAt,
      updatedAt: this.tick(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.respond('delete', [id]);
    this.replace({ ...this.find(id, false), deleted: true });
  }

  async restore(id: string): Promise<Todo> {
    await this.respond('restore', [id]);
    return this.replace({ ...this.find(id, true), deleted: false });
  }

  async clearCompleted(): Promise<ClearCompletedResponse> {
    await this.respond('clearCompleted', []);
    const ids = this.live()
      .filter((t) => t.completed)
      .map((t) => this.replace({ ...t, deleted: true }).id);
    return { data: { ids }, meta: { deleted: ids.length } };
  }

  async restoreMany(ids: readonly string[]): Promise<Todo[]> {
    await this.respond('restoreMany', [ids]);
    return this.rows
      .filter((t) => t.deleted && ids.includes(t.id))
      .map((t) => this.replace({ ...t, deleted: false }));
  }

  private async respond(operation: Operation, args: unknown[]): Promise<void> {
    this.calls.push({ operation, args });
    const gate = this.gate;
    if (gate && (gate.operation === undefined || gate.operation === operation)) await gate.promise;
    await Promise.resolve();
    const index = this.failures.findIndex((f) => f.operation === operation);
    if (index >= 0) {
      const [failure] = this.failures.splice(index, 1);
      if (failure) throw failure.error;
    }
  }

  private live(): StoredTodo[] {
    return this.rows
      .filter((t) => !t.deleted)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }

  private find(id: string, deleted: boolean): StoredTodo {
    const row = this.rows.find((t) => t.id === id && t.deleted === deleted);
    if (!row) {
      throw new ApiError('client', 404, {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'The requested resource was not found.',
      });
    }
    return row;
  }

  private replace(row: StoredTodo): Todo {
    this.rows = this.rows.map((t) => (t.id === row.id ? row : t));
    return strip(row);
  }

  private tick(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  private newId(): string {
    return `01jz${String(this.nextId++).padStart(22, '0')}`;
  }
}

function strip(row: StoredTodo): Todo {
  const { id, title, completed, completedAt, createdAt, updatedAt } = row;
  return { id, title, completed, completedAt, createdAt, updatedAt };
}
