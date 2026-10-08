// Traces to: L2-042
import { render, screen } from '@testing-library/angular';
import { TodoApi } from '../../../core/api/todo-api';
import { InMemoryTodoApi } from '../../../../testing/in-memory-todo-api';
import { fakeMedia } from '../../../../testing/media';
import { TodoPageComponent } from './todo-page.component';

const OFFLINE = "You're offline. Changes will fail until you reconnect.";

function setOnline(online: boolean): void {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
}

async function renderPage() {
  const result = await render(TodoPageComponent, {
    providers: [{ provide: TodoApi, useValue: new InMemoryTodoApi() }],
  });
  await result.fixture.whenStable();
  return result;
}

describe('TodoPageComponent connectivity', () => {
  beforeEach(() => {
    fakeMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows a non-blocking banner while offline and removes it on reconnect', async () => {
    setOnline(true);
    const { fixture } = await renderPage();
    expect(screen.queryByText(OFFLINE)).not.toBeInTheDocument();

    setOnline(false);
    window.dispatchEvent(new Event('offline'));
    await fixture.whenStable();
    expect(screen.getByText(OFFLINE)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'New task' })).toBeEnabled();

    setOnline(true);
    window.dispatchEvent(new Event('online'));
    await fixture.whenStable();
    expect(screen.queryByText(OFFLINE)).not.toBeInTheDocument();
  });

  it('shows the banner from the start when the page loads offline', async () => {
    setOnline(false);

    await renderPage();

    expect(screen.getByText(OFFLINE)).toBeInTheDocument();
  });
});
