// Traces to: L2-012, L2-013, L2-014, L2-029, L2-031
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
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
  return result;
}

const editor = () => screen.getByRole('textbox', { name: 'Edit task title' });
const updates = (api: InMemoryTodoApi) => api.calls.filter((c) => c.operation === 'update');

describe('TodoPageComponent editing a title', () => {
  beforeEach(() => {
    fakeMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a field with the title selected when the title is clicked', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));

    const field = editor() as HTMLInputElement;
    expect(field).toHaveValue('Call mom');
    expect(field).toHaveFocus();
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'Call mom'.length]);
  });

  it('saves on Enter, optimistically, and returns focus to the title', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    const { fixture } = await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));
    await userEvent.type(editor(), ' Sunday{Enter}');

    const title = screen.getByRole('button', { name: 'Edit Call mom Sunday' });
    expect(title).toHaveFocus();
    await fixture.whenStable();
    expect(updates(api).map((c) => c.args[1])).toEqual([{ title: 'Call mom Sunday' }]);
    expect(TestBed.inject(Announcer).message()).toBe('Task updated');
  });

  it('cancels on Escape without a request and returns focus to the title', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));
    await userEvent.type(editor(), ' Sunday{Escape}');

    expect(screen.getByRole('button', { name: 'Edit Call mom' })).toHaveFocus();
    expect(updates(api)).toEqual([]);
  });

  it('saves a changed title when the field loses focus', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    const { fixture } = await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));
    await userEvent.type(editor(), ' Sunday');
    await userEvent.click(document.body);
    await fixture.whenStable();

    expect(screen.getByRole('button', { name: 'Edit Call mom Sunday' })).toBeInTheDocument();
    expect(updates(api)).toHaveLength(1);
  });

  it('lets a completed task be edited too', async () => {
    const api = new InMemoryTodoApi();
    api.seed({ title: 'Call mom', completed: true });
    await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));

    expect(editor()).toHaveValue('Call mom');
  });

  it('saves the first title when editing moves to another task', async () => {
    const api = new InMemoryTodoApi();
    api.seed('First', 'Second');
    const { fixture } = await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit First' }));
    await userEvent.type(editor(), ' edited');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Second' }));
    await fixture.whenStable();

    expect(screen.getByRole('button', { name: 'Edit First edited' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'Edit task title' })).toHaveLength(1);
    expect(editor()).toHaveValue('Second');
  });

  it('sends nothing for an unchanged title', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));
    await userEvent.type(editor(), '  {Enter}');

    expect(updates(api)).toEqual([]);
  });

  it('puts the title back and explains when the field is cleared', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    await renderPage(api);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));
    await userEvent.clear(editor());
    await userEvent.keyboard('{Enter}');

    expect(editor()).toHaveValue('Call mom');
    expect(editor()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('A task needs a title.');
    expect(updates(api)).toEqual([]);
  });

  it('restores the previous title when the save fails', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom');
    const { fixture } = await renderPage(api);
    api.failNext('update');

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));
    await userEvent.type(editor(), ' Sunday{Enter}');
    await fixture.whenStable();

    expect(screen.getByRole('button', { name: 'Edit Call mom' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save that change.");
  });

  it('removes a task that was deleted elsewhere', async () => {
    const api = new InMemoryTodoApi();
    api.seed('Call mom', 'Keep me');
    const { fixture } = await renderPage(api);
    api.failNext('update', new ApiError('client', 404));

    await userEvent.click(screen.getByRole('button', { name: 'Edit Call mom' }));
    await userEvent.type(editor(), ' Sunday{Enter}');
    await fixture.whenStable();

    expect(screen.queryByRole('checkbox', { name: /Call mom/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Keep me' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('That task no longer exists.');
  });
});
