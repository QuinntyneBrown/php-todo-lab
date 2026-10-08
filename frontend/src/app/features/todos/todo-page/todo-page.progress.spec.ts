// Traces to: L2-007
import { render, screen } from '@testing-library/angular';
import { TodoApi } from '../../../core/api/todo-api';
import { InMemoryTodoApi } from '../../../../testing/in-memory-todo-api';
import { fakeMedia } from '../../../../testing/media';
import { TodoPageComponent } from './todo-page.component';

describe('TodoPageComponent progress', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('counts the active tasks from the loaded list', async () => {
    fakeMedia();
    const api = new InMemoryTodoApi();
    api.seed('A', { title: 'B', completed: true }, 'C', { title: 'D', completed: true }, 'E');
    const { fixture } = await render(TodoPageComponent, {
      providers: [{ provide: TodoApi, useValue: api }],
    });
    await fixture.whenStable();

    expect(screen.getByTestId('progress')).toHaveTextContent('3 left');
  });
});
