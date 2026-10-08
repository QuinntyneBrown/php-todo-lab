// Traces to: L2-001, L2-002, L2-029
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TodoComposerComponent } from './todo-composer.component';

async function renderComposer() {
  const submitted = vi.fn<(title: string) => void>();
  await render(TodoComposerComponent, { on: { submitted } });
  const field = screen.getByRole('textbox', { name: 'New task' });
  return { submitted, field };
}

describe('TodoComposerComponent', () => {
  it('submits the trimmed title on Enter, then clears and keeps focus', async () => {
    const { submitted, field } = await renderComposer();

    await userEvent.type(field, '  Walk the dog  {Enter}');

    expect(submitted).toHaveBeenCalledExactlyOnceWith('Walk the dog');
    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
  });

  it('submits when the Add task button is clicked', async () => {
    const { submitted, field } = await renderComposer();

    await userEvent.type(field, 'Buy oat milk');
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));

    expect(submitted).toHaveBeenCalledExactlyOnceWith('Buy oat milk');
  });

  it('refuses an empty or whitespace-only title with a message', async () => {
    const { submitted, field } = await renderComposer();

    await userEvent.type(field, '   {Enter}');

    expect(submitted).not.toHaveBeenCalled();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Enter a task title.');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a task title.');
  });

  it('clears the message once the user types again', async () => {
    const { field } = await renderComposer();

    await userEvent.type(field, '{Enter}');
    await userEvent.type(field, 'B');

    expect(field).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a live n/200 counter from 160 characters', async () => {
    const { field } = await renderComposer();

    await userEvent.type(field, 'a'.repeat(159));
    expect(screen.queryByText('159/200')).not.toBeInTheDocument();

    await userEvent.type(field, 'a');
    expect(screen.getByText('160/200')).toBeInTheDocument();
  });

  it('stops at 200 characters, counting characters rather than code units', async () => {
    const { field } = await renderComposer();

    await userEvent.click(field);
    await userEvent.paste('🍣'.repeat(205));

    expect(Array.from((field as HTMLInputElement).value)).toHaveLength(200);
    expect(screen.getByText('200/200')).toBeInTheDocument();
  });
});
