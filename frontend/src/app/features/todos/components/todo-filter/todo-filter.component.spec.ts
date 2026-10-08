// Traces to: L2-006, L2-007, L2-029
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { TodoFilter } from '../../todo.store';
import { TodoFilterComponent } from './todo-filter.component';

async function renderFilter(selected: TodoFilter = 'all') {
  const selectedChange = vi.fn<(filter: TodoFilter) => void>();
  await render(TodoFilterComponent, {
    inputs: { selected, allCount: 5, activeCount: 2, doneCount: 3 },
    on: { selectedChange },
  });
  return { selectedChange };
}

describe('TodoFilterComponent', () => {
  it('is a labelled group of buttons whose names include their counts', async () => {
    await renderFilter();

    const group = screen.getByRole('group', { name: 'Show tasks' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done 3' })).toBeInTheDocument();
  });

  it('marks only the selected filter as pressed', async () => {
    await renderFilter('done');

    expect(screen.getByRole('button', { name: /^Done/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^Active/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('emits the filter the user picks', async () => {
    const { selectedChange } = await renderFilter();

    await userEvent.click(screen.getByRole('button', { name: /^Active/ }));

    expect(selectedChange).toHaveBeenCalledExactlyOnceWith('active');
  });
});
