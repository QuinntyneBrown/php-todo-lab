// Traces to: L2-001, L2-003, L2-004, L2-007, L2-031
import { TestBed } from '@angular/core/testing';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../core/api/api-error';
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
  return { ...result, composer: screen.getByRole('textbox', { name: 'New task' }) };
}

const rows = () => within(screen.getByRole('list', { name: 'Tasks' })).getAllByRole('listitem');

function firstRow(): HTMLElement {
  const [row] = rows();
  if (!row) throw new Error('Expected at least one row');
  return row;
}

describe('TodoPageComponent adding a task', () => {
  beforeEach(() => {
    fakeMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the new task at the top at once, pending until the server confirms', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Older');
    const { fixture, composer } = await renderPage(api);
    const release = api.hold();

    await userEvent.type(composer, 'Buy oat milk{Enter}');

    expect(within(firstRow()).getByRole('checkbox', { name: 'Buy oat milk' })).toBeDisabled();
    expect(api.calls.at(-1)).toEqual({ operation: 'create', args: ['Buy oat milk'] });

    release();
    await fixture.whenStable();
    expect(within(firstRow()).getByRole('checkbox', { name: 'Buy oat milk' })).toBeEnabled();
    expect(rows()).toHaveLength(2);
  });

  it('announces the added task with the new count', async () => {
    const { fixture, composer } = await renderPage(new InMemoryTodoApi());

    await userEvent.type(composer, 'Buy oat milk{Enter}');
    await fixture.whenStable();

    expect(TestBed.inject(Announcer).message()).toBe('Task added. 1 left');
  });

  it('restores the title and shows an error toast when the add fails', async () => {
    const api = new InMemoryTodoApi();
    api.failNext('create', new ApiError('server', 503));
    const { fixture, composer } = await renderPage(api);

    await userEvent.type(composer, 'Buy oat milk{Enter}');
    await fixture.whenStable();

    expect(screen.queryByRole('list', { name: 'Tasks' })).not.toBeInTheDocument();
    expect(composer).toHaveValue('Buy oat milk');
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't add that task. Try again.");
  });

  it('keeps the text and shows the limit message at the composer at 500 tasks', async () => {
    const api = new InMemoryTodoApi();
    api.seed(...Array.from({ length: 500 }, (_, i) => `Task ${String(i)}`));
    const { fixture, composer } = await renderPage(api);

    await userEvent.type(composer, 'One more{Enter}');
    await fixture.whenStable();

    expect(rows()).toHaveLength(500);
    expect(composer).toHaveValue('One more');
    expect(composer).toHaveAttribute('aria-invalid', 'true');
    expect(composer).toHaveAccessibleDescription(
      'You have 500 tasks. Finish or delete some to add more.',
    );
  });
});
