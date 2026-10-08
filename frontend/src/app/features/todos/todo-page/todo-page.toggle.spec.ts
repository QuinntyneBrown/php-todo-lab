// Traces to: L2-006, L2-009, L2-010, L2-023, L2-031
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { routes } from '../../../app.routes';
import { TodoApi } from '../../../core/api/todo-api';
import { Announcer } from '../../../shared/ui/announcer/announcer';
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

describe('TodoPageComponent completing a task', () => {
  beforeEach(() => {
    fakeMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('checks the task and updates the count before the server answers', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom', 'Buy milk');
    await openAt('/', api);
    const release = api.hold();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Call mom' }));

    expect(screen.getByRole('checkbox', { name: 'Call mom' })).toBeChecked();
    expect(screen.getByTestId('progress')).toHaveTextContent('1 left');
    expect(api.calls.at(-1)?.args[1]).toEqual({ completed: true });
    expect(TestBed.inject(Announcer).message()).toBe('Task completed. 1 left');
    release();
  });

  it('toggles with Space on the focused checkbox, and announces a reopen', async () => {
    const api = new InMemoryTodoApi();
    api.seed({ title: 'Call mom', completed: true });
    const harness = await openAt('/', api);

    screen.getByRole('checkbox', { name: 'Call mom' }).focus();
    await userEvent.keyboard(' ');
    await harness.fixture.whenStable();

    expect(screen.getByRole('checkbox', { name: 'Call mom' })).not.toBeChecked();
    expect(api.todos[0]?.completed).toBe(false);
    expect(TestBed.inject(Announcer).message()).toBe('Task reopened. 1 left');
  });

  it('reverts and explains when the update fails', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    const harness = await openAt('/', api);
    api.failNext('update');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Call mom' }));
    await harness.fixture.whenStable();

    expect(screen.getByRole('checkbox', { name: 'Call mom' })).not.toBeChecked();
    expect(screen.getByTestId('progress')).toHaveTextContent('1 left');
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't update that task.");
  });

  it('lets a task completed on Active play its animation, then leave within 600 ms', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom', 'Buy milk');
    await openAt('/?filter=active', api);
    expect(TestBed.inject(Router).url).toBe('/?filter=active');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Call mom' }));
    const started = performance.now();

    expect(screen.getByRole('checkbox', { name: 'Call mom' })).toBeChecked();
    await waitFor(
      () => {
        expect(screen.queryByRole('checkbox', { name: 'Call mom' })).not.toBeInTheDocument();
      },
      { timeout: 600 },
    );
    expect(performance.now() - started).toBeGreaterThanOrEqual(300);
  });
});
