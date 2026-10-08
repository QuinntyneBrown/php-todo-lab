import type { ClearCompletedResponse, Todo, TodoListResponse, UpdateTodoPayload } from './models';

/**
 * The port the store depends on (L2-048). Every method rejects with an ApiError.
 * HttpTodoApi is the real adapter; tests use InMemoryTodoApi.
 */
export abstract class TodoApi {
  abstract list(): Promise<TodoListResponse>;
  abstract create(title: string): Promise<Todo>;
  abstract update(id: string, changes: UpdateTodoPayload): Promise<Todo>;
  abstract delete(id: string): Promise<void>;
  abstract restore(id: string): Promise<Todo>;
  abstract clearCompleted(): Promise<ClearCompletedResponse>;
  abstract restoreMany(ids: readonly string[]): Promise<Todo[]>;
}
