// Traces to: L2-009, L2-010, L2-052
import { InMemoryTodoApi } from '../../../testing/in-memory-todo-api';
import { loadedStore } from '../../../testing/loaded-store';

describe('TodoStore toggle', () => {
  it('completes a task at once, before the server answers', async () => {
    const api = new InMemoryTodoApi();
    const todo = api.seedOne('Call mom');
    const store = await loadedStore(api);
    const release = api.hold();

    const done = store.toggle(todo.id, true);

    expect(store.todos()[0]?.completed).toBe(true);
    expect(store.activeCount()).toBe(0);
    expect(store.completedCount()).toBe(1);

    release();
    await done;
    expect(store.todos()[0]?.completedAt).toBe(api.todos[0]?.completedAt);
  });

  it('reverts the task and the counts, with a toast, when the update fails', async () => {
    const api = new InMemoryTodoApi();
    const todo = api.seedOne('Call mom');
    const store = await loadedStore(api);
    api.failNext('update');

    await store.toggle(todo.id, true);

    expect(store.todos()[0]?.completed).toBe(false);
    expect(store.activeCount()).toBe(1);
    expect(store.toast()).toEqual({
      message: "Couldn't update that task.",
      tone: 'error',
      undo: null,
    });
  });

  it('applies rapid toggles in order so the server ends where the UI does', async () => {
    const api = new InMemoryTodoApi();
    const todo = api.seedOne('Call mom');
    const store = await loadedStore(api);
    const release = api.hold();

    const toggles = [
      store.toggle(todo.id, true),
      store.toggle(todo.id, false),
      store.toggle(todo.id, true),
    ];
    release();
    await Promise.all(toggles);

    expect(api.calls.filter((c) => c.operation === 'update').map((c) => c.args[1])).toEqual([
      { completed: true },
      { completed: false },
      { completed: true },
    ]);
    expect(store.todos()[0]?.completed).toBe(true);
    expect(api.todos[0]?.completed).toBe(true);
  });

  it('settles on the last confirmed server state when a queued toggle fails', async () => {
    const api = new InMemoryTodoApi();
    const todo = api.seedOne('Call mom');
    const store = await loadedStore(api);
    const release = api.hold();

    const first = store.toggle(todo.id, true);
    api.failNext('update');
    const toggles = [first, store.toggle(todo.id, false)];
    release();
    await Promise.all(toggles);

    expect(store.todos()[0]?.completed).toBe(api.todos[0]?.completed);
  });
});
