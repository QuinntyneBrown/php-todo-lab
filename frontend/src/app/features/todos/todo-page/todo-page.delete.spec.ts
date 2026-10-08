// Traces to: L2-015, L2-029, L2-031
import { TestBed } from '@angular/core/testing';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TodoApi } from '../../../core/api/todo-api';
import { Announcer } from '../../../shared/ui/announcer/announcer';
import { InMemoryTodoApi } from '../../../../testing/in-memory-todo-api';
import { fakeMedia } from '../../../../testing/media';
import { TodoPageComponent } from './todo-page.component';

async function renderPage(api: InMemoryTodoApi) {
  const result = await render(TodoPageComponent, {
    providers: [{ provide: TodoApi, useValue: api }],
  });
  await result.fixture.whenStable();
  return result;
}

function shown(): string[] {
  const list = screen.queryByRole('list', { name: 'Tasks' });
  if (!list) return [];
  return within(list)
    .getAllByRole('checkbox')
    .map((box) => box.getAttribute('aria-label') ?? '');
}

describe('TodoPageComponent deleting a task', () => {
  beforeEach(() => {
    fakeMedia('(hover: hover)');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes the row and offers Undo in a status toast', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', 'B');
    const { fixture } = await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    await fixture.whenStable();

    expect(shown()).toEqual(['B']);
    expect(screen.getByRole('status')).toHaveTextContent('Task deleted');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(api.todos.map((t) => t.title)).toEqual(['B']);
    expect(TestBed.inject(Announcer).message()).toBe('Task deleted. 1 left');
  });

  it('puts the task back in its place, still completed, on Undo', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', { title: 'B', completed: true }, 'C');
    const { fixture } = await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Delete B' }));
    await fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await fixture.whenStable();

    expect(shown()).toEqual(['C', 'B', 'A']);
    expect(screen.getByRole('checkbox', { name: 'B' })).toBeChecked();
    expect(api.todos.map((t) => t.title)).toEqual(['C', 'B', 'A']);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(TestBed.inject(Announcer).message()).toBe('Task restored. 2 left');
  });

  it('applies Undo to the latest deletion only', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', 'B', 'C');
    const { fixture } = await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete B' }));
    await fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await fixture.whenStable();

    expect(shown()).toEqual(['C', 'B']);
  });

  it('undoes with Ctrl+Z while the toast is visible', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A');
    const { fixture } = await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    await fixture.whenStable();
    await userEvent.keyboard('{Control>}z{/Control}');
    await fixture.whenStable();

    expect(shown()).toEqual(['A']);
  });

  it('brings the row back and explains when the delete fails', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', 'B');
    const { fixture } = await renderPage(api);
    api.failNext('delete');

    await userEvent.click(screen.getByRole('button', { name: 'Delete A' }));
    await fixture.whenStable();

    expect(shown()).toEqual(['B', 'A']);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't delete that task.");
  });

  it('moves focus to the next row after a keyboard delete, without focusing the toast', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', 'B', 'C');
    const { fixture } = await renderPage(api);

    screen.getByRole('button', { name: 'Delete B' }).focus();
    await userEvent.keyboard('{Enter}');
    await fixture.whenStable();

    expect(screen.getByRole('checkbox', { name: 'A' })).toHaveFocus();
  });

  it('moves focus to the previous row when the last row is deleted by keyboard', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', 'B');
    const { fixture } = await renderPage(api);

    screen.getByRole('button', { name: 'Delete A' }).focus();
    await userEvent.keyboard('{Enter}');
    await fixture.whenStable();

    expect(screen.getByRole('checkbox', { name: 'B' })).toHaveFocus();
  });

  it('moves focus to the composer when the list empties, and Undo is reachable by Tab', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A');
    const { fixture } = await renderPage(api);

    screen.getByRole('button', { name: 'Delete A' }).focus();
    await userEvent.keyboard('{Enter}');
    await fixture.whenStable();

    expect(screen.getByRole('textbox', { name: 'New task' })).toHaveFocus();
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(undo.tabIndex).toBe(0);
  });
});
