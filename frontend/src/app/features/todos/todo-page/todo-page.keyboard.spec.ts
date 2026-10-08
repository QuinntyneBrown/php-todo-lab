// Traces to: L2-023
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TodoApi } from '../../../core/api/todo-api';
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

describe('TodoPageComponent keyboard operation', () => {
  beforeEach(() => {
    fakeMedia('(hover: none)');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('moves focus to the composer when / is pressed outside a text field', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A');
    const { fixture } = await renderPage(api);
    screen.getByRole('checkbox', { name: 'A' }).focus();

    await userEvent.keyboard('/');
    await fixture.whenStable();

    const composer = screen.getByRole('textbox', { name: 'New task' });
    expect(composer).toHaveFocus();
    expect(composer).toHaveValue('');
  });

  it('types a / inside a text field as text', async () => {
    await renderPage(new InMemoryTodoApi());
    const composer = screen.getByRole('textbox', { name: 'New task' });

    await userEvent.type(composer, 'a/b');

    expect(composer).toHaveValue('a/b');
  });

  it('tabs through composer, Add task, filters, Clear completed, then each row', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', 'B');
    await renderPage(api);
    const expected = [
      screen.getByRole('textbox', { name: 'New task' }),
      screen.getByRole('button', { name: 'Add task' }),
      screen.getByRole('button', { name: /^All/ }),
      screen.getByRole('button', { name: /^Active/ }),
      screen.getByRole('button', { name: /^Done/ }),
      screen.getByRole('button', { name: 'Clear completed' }),
      screen.getByRole('checkbox', { name: 'B' }),
      screen.getByRole('button', { name: 'Edit B' }),
      screen.getByRole('button', { name: 'Delete B' }),
      screen.getByRole('checkbox', { name: 'A' }),
      screen.getByRole('button', { name: 'Edit A' }),
      screen.getByRole('button', { name: 'Delete A' }),
    ];

    const reached: (Element | null)[] = [];
    while (reached.length < expected.length) {
      await userEvent.tab();
      reached.push(document.activeElement);
    }

    expect(reached).toEqual(expected);
  });

  it('starts editing when Enter is pressed on a focused title', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    await renderPage(api);
    screen.getByRole('button', { name: 'Edit Call mom' }).focus();

    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('textbox', { name: 'Edit task title' })).toHaveFocus();
  });
});
