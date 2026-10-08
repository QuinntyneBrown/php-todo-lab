// Traces to: L2-017
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { routes } from '../../../app.routes';
import { TodoApi } from '../../../core/api/todo-api';
import { InMemoryTodoApi } from '../../../../testing/in-memory-todo-api';
import { fakeMedia } from '../../../../testing/media';

async function openAt(url: string, api: InMemoryTodoApi) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: TodoApi, useValue: api },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  return harness;
}

function seeded(): InMemoryTodoApi {
  const api = new InMemoryTodoApi();
  api.seed({ title: 'A', completed: true }, 'B', { title: 'C', completed: true }, 'D', {
    title: 'E',
    completed: true,
  });
  return api;
}

function shown(): string[] {
  const list = screen.queryByRole('list', { name: 'Tasks' });
  if (!list) return [];
  return within(list)
    .getAllByRole('checkbox')
    .map((box) => box.getAttribute('aria-label') ?? '');
}

const clearButton = () => screen.getByRole('button', { name: 'Clear completed' });

describe('TodoPageComponent clearing completed tasks', () => {
  beforeEach(() => {
    fakeMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes the completed tasks, keeps the active ones, and offers Undo', async () => {
    const api = seeded();
    const harness = await openAt('/', api);

    await userEvent.click(clearButton());
    await harness.fixture.whenStable();

    expect(shown()).toEqual(['D', 'B']);
    expect(screen.getByRole('status')).toHaveTextContent('3 tasks cleared');
    expect(api.todos.map((t) => t.title)).toEqual(['D', 'B']);
  });

  it('brings all of them back on Undo', async () => {
    const api = seeded();
    const harness = await openAt('/', api);

    await userEvent.click(clearButton());
    await harness.fixture.whenStable();
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await harness.fixture.whenStable();

    expect(shown()).toEqual(['E', 'D', 'C', 'B', 'A']);
    expect(api.calls.at(-1)?.operation).toBe('restoreMany');
    expect(api.todos).toHaveLength(5);
  });

  it('is disabled when nothing is completed', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Only active');
    await openAt('/', api);

    expect(clearButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(clearButton());

    expect(api.calls.some((c) => c.operation === 'clearCompleted')).toBe(false);
  });

  it('leaves the Done view empty with its own message', async () => {
    const harness = await openAt('/?filter=done', seeded());

    await userEvent.click(clearButton());
    await harness.fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Nothing completed yet' })).toBeInTheDocument();
  });

  it('brings the tasks back and explains when the clear fails', async () => {
    const api = seeded();
    const harness = await openAt('/', api);
    api.failNext('clearCompleted');

    await userEvent.click(clearButton());
    await harness.fixture.whenStable();

    expect(shown()).toEqual(['E', 'D', 'C', 'B', 'A']);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't clear completed tasks.");
  });
});
