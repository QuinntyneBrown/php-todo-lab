// Traces to: L2-003, L2-004, L2-052
import { TestBed } from '@angular/core/testing';
import { ApiError } from '../../core/api/api-error';
import { TodoApi } from '../../core/api/todo-api';
import { InMemoryTodoApi } from '../../../testing/in-memory-todo-api';
import { loadedStore } from '../../../testing/loaded-store';
import { TodoStore } from './todo.store';

describe('TodoStore add', () => {
  it('shows the task at once as pending, then swaps in the server version', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Older');
    const store = await loadedStore(api);
    const release = api.hold();

    const result = store.add('Buy oat milk');

    expect(store.todos().map((t) => [t.title, t.pending ?? false])).toEqual([
      ['Buy oat milk', true],
      ['Older', false],
    ]);
    expect(store.activeCount()).toBe(2);

    release();
    await expect(result).resolves.toEqual({ ok: true });
    const [added] = store.todos();
    expect(added?.pending).toBeUndefined();
    expect(added?.id).toBe(api.todos[0]?.id);
  });

  it('keeps a task added while the list is still loading', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Older');
    const release = api.hold();
    TestBed.configureTestingModule({ providers: [{ provide: TodoApi, useValue: api }] });
    const store = TestBed.inject(TodoStore);
    TestBed.tick();

    const added = store.add('Added during load');
    release();
    await added;
    await vi.waitFor(() => {
      expect(store.loading()).toBe(false);
    });

    expect(store.todos().map((t) => [t.title, t.pending ?? false])).toEqual([
      ['Added during load', false],
      ['Older', false],
    ]);
  });

  it('shows a task once when a reload already holds it before its create answers', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Older');
    const store = await loadedStore(api);
    api.hold('create');
    void store.add('Twice?');
    api.seed('Twice?'); // the server has stored it, but its response has not arrived

    store.reload();
    await vi.waitFor(() => {
      expect(store.loading()).toBe(false);
    });

    expect(store.todos().map((t) => t.title)).toEqual(['Twice?', 'Older']);
  });

  it('removes the pending task and reports the title when the request fails', async () => {
    const api = new InMemoryTodoApi();
    const store = await loadedStore(api);
    api.failNext('create', new ApiError('network'));

    const result = await store.add('Buy oat milk');

    expect(result).toEqual({ ok: false, title: 'Buy oat milk' });
    expect(store.todos()).toEqual([]);
    expect(store.toast()).toEqual({
      message: "Couldn't add that task. Try again.",
      tone: 'error',
      undo: null,
    });
  });

  it('reports the server field message on 422 without a toast', async () => {
    const api = new InMemoryTodoApi();
    api.seed(...Array.from({ length: 500 }, (_, i) => `Task ${String(i)}`));
    const store = await loadedStore(api);

    const result = await store.add('One more');

    expect(result).toEqual({
      ok: false,
      title: 'One more',
      fieldError: 'You have 500 tasks. Finish or delete some to add more.',
    });
    expect(store.todos()).toHaveLength(500);
    expect(store.toast()).toBeNull();
  });
});
