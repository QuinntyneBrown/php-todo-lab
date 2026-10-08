// Traces to: L2-015, L2-052
import { InMemoryTodoApi } from '../../../testing/in-memory-todo-api';
import { loadedStore } from '../../../testing/loaded-store';

describe('TodoStore delete and undo', () => {
  it('waits for an in-flight delete before restoring', async () => {
    const api = new InMemoryTodoApi();
    const todo = api.seedOne('A');
    const store = await loadedStore(api);
    const release = api.hold();

    const deleting = store.delete(todo.id);
    const undoing = store.undo();
    expect(store.todos().map((t) => t.title)).toEqual(['A']);

    release();
    await Promise.all([deleting, undoing]);

    expect(api.calls.map((c) => c.operation).slice(-2)).toEqual(['delete', 'restore']);
    expect(api.todos.map((t) => t.title)).toEqual(['A']);
  });

  it('removes the task again and explains when the restore fails', async () => {
    const api = new InMemoryTodoApi();
    const todo = api.seedOne('A');
    const store = await loadedStore(api);
    await store.delete(todo.id);
    api.failNext('restore');

    await store.undo();

    expect(store.todos()).toEqual([]);
    expect(store.toast()).toEqual({
      message: "Couldn't restore that task.",
      tone: 'error',
      undo: null,
    });
  });
});
