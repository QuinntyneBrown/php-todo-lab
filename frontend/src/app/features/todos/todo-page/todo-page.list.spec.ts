// Traces to: L2-005, L2-008, L2-029
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TodoApi } from '../../../core/api/todo-api';
import { InMemoryTodoApi } from '../../../../testing/in-memory-todo-api';
import { fakeMedia } from '../../../../testing/media';
import { TodoPageComponent } from './todo-page.component';

async function renderPage(api: InMemoryTodoApi) {
  const result = await render(TodoPageComponent, {
    providers: [{ provide: TodoApi, useValue: api }],
  });
  return result;
}

function titles(): string[] {
  return within(screen.getByRole('list', { name: 'Tasks' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('checkbox').getAttribute('aria-label') ?? '');
}

describe('TodoPageComponent list states', () => {
  beforeEach(() => {
    fakeMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows three skeleton rows while loading, with the composer already usable', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A');
    const release = api.hold();
    const { fixture } = await renderPage(api);

    expect(screen.getByTestId('skeleton').querySelectorAll('li')).toHaveLength(3);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'New task' })).toBeEnabled();

    release();
    await fixture.whenStable();
    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
  });

  it('lists tasks newest first as list items', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A', 'B', 'C');
    const { fixture } = await renderPage(api);
    await fixture.whenStable();

    expect(titles()).toEqual(['C', 'B', 'A']);
  });

  it('shows the empty state when there are no tasks', async () => {
    const { fixture } = await renderPage(new InMemoryTodoApi());
    await fixture.whenStable();

    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
    expect(screen.getByText('Type a task above and press Enter.')).toBeInTheDocument();
  });

  it('shows an error banner that reloads the list on Try again', async () => {
    const api = new InMemoryTodoApi();
    api.seed('A');
    api.failNext('list');
    const { fixture } = await renderPage(api);
    await fixture.whenStable();

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't load your tasks. Check your connection and try again.",
    );
    expect(screen.getByRole('textbox', { name: 'New task' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await fixture.whenStable();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(titles()).toEqual(['A']);
  });
});
