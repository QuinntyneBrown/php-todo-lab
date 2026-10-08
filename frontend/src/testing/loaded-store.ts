import { TestBed } from '@angular/core/testing';
import { TodoApi } from '../app/core/api/todo-api';
import { TodoStore } from '../app/features/todos/todo.store';
import type { InMemoryTodoApi } from './in-memory-todo-api';

/** A TodoStore over `api`, after its first list load has finished. */
export async function loadedStore(api: InMemoryTodoApi): Promise<TodoStore> {
  TestBed.configureTestingModule({ providers: [{ provide: TodoApi, useValue: api }] });
  const store = TestBed.inject(TodoStore);
  await vi.waitFor(() => {
    expect(store.loading()).toBe(false);
  });
  return store;
}
