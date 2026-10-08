// Traces to: L2-001, L2-006, L2-008
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { routes } from '../../../app.routes';
import { TodoApi } from '../../../core/api/todo-api';
import { InMemoryTodoApi } from '../../../../testing/in-memory-todo-api';
import { fakeMedia } from '../../../../testing/media';

/** Three active and two completed tasks, in the routed app at `url`. */
async function openAt(url: string, api = seeded()) {
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
  api.seed('A', { title: 'B', completed: true }, 'C', { title: 'D', completed: true }, 'E');
  return api;
}

function shown(): string[] {
  const list = screen.queryByRole('list', { name: 'Tasks' });
  if (!list) return [];
  return within(list)
    .getAllByRole('checkbox')
    .map((box) => box.getAttribute('aria-label') ?? '');
}

describe('TodoPageComponent filtering', () => {
  beforeEach(() => {
    fakeMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows exactly the active or completed tasks and mirrors the choice in the URL', async () => {
    const harness = await openAt('/');

    await userEvent.click(screen.getByRole('button', { name: /^Active/ }));
    await harness.fixture.whenStable();
    expect(shown()).toEqual(['E', 'C', 'A']);
    expect(TestBed.inject(Router).url).toBe('/?filter=active');
    expect(screen.getByRole('button', { name: /^Active/ })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /^Done/ }));
    await harness.fixture.whenStable();
    expect(shown()).toEqual(['D', 'B']);
    expect(TestBed.inject(Router).url).toBe('/?filter=done');

    await userEvent.click(screen.getByRole('button', { name: /^All/ }));
    await harness.fixture.whenStable();
    expect(shown()).toEqual(['E', 'D', 'C', 'B', 'A']);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('restores the filter from the URL on load', async () => {
    await openAt('/?filter=done');

    expect(screen.getByRole('button', { name: /^Done/ })).toHaveAttribute('aria-pressed', 'true');
    expect(shown()).toEqual(['D', 'B']);
  });

  it('treats an unknown filter in the URL as All', async () => {
    await openAt('/?filter=bogus');

    expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'true');
    expect(shown()).toHaveLength(5);
  });

  it('shows the counts on the tabs', async () => {
    await openAt('/');

    expect(screen.getByRole('button', { name: 'All 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done 2' })).toBeInTheDocument();
  });

  it('says why a filtered list is empty', async () => {
    const api = new InMemoryTodoApi();
    api.seed({ title: 'Only done', completed: true });
    await openAt('/?filter=active', api);

    expect(screen.getByRole('heading', { name: 'All clear' })).toBeInTheDocument();
    expect(screen.getByText('Nothing left to do.')).toBeInTheDocument();
  });

  it('says when nothing is completed yet', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Only active');
    await openAt('/?filter=done', api);

    expect(screen.getByRole('heading', { name: 'Nothing completed yet' })).toBeInTheDocument();
  });

  it('switches to All when a task is added on the Done filter', async () => {
    const harness = await openAt('/?filter=done');

    await userEvent.type(screen.getByRole('textbox', { name: 'New task' }), 'Fresh{Enter}');
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(shown()[0]).toBe('Fresh');
  });
});
