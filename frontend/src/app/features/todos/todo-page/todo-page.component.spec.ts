// Traces to: L2-022, L2-029
import { render, screen } from '@testing-library/angular';
import { TodoApi } from '../../../core/api/todo-api';
import { InMemoryTodoApi } from '../../../../testing/in-memory-todo-api';
import { fakeMedia } from '../../../../testing/media';
import { TodoPageComponent } from './todo-page.component';

async function renderPage(api = new InMemoryTodoApi()) {
  const result = await render(TodoPageComponent, {
    providers: [{ provide: TodoApi, useValue: api }],
  });
  await result.fixture.whenStable();
  return result;
}

describe('TodoPageComponent shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the weekday as the only heading level 1 and the date beside it', async () => {
    fakeMedia();
    const today = new Date();

    await renderPage();

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(today.toLocaleDateString(undefined, { weekday: 'long' }));
    expect(
      screen.getByText(today.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })),
    ).toBeInTheDocument();
  });

  it('is one main region with no dialogs', async () => {
    fakeMedia();

    await renderPage();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('labels the composer "New task" and focuses it on devices that can hover', async () => {
    fakeMedia('(hover: hover)');

    await renderPage();

    expect(screen.getByRole('textbox', { name: 'New task' })).toHaveFocus();
  });

  it('does not force focus on touch devices', async () => {
    fakeMedia('(hover: none)');

    await renderPage();

    expect(screen.getByRole('textbox', { name: 'New task' })).not.toHaveFocus();
  });
});
