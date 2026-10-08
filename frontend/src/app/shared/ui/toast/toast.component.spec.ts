// Traces to: L2-015, L2-031
import { render, screen } from '@testing-library/angular';
import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { ToastComponent } from './toast.component';
import type { ToastState } from './toast-state';

const deleted: ToastState = { message: 'Task deleted', tone: 'status', undo: { ids: ['a'] } };

async function renderToast(toast: ToastState) {
  const dismissed = vi.fn();
  const undone = vi.fn();
  const result = await render(ToastComponent, { inputs: { toast }, on: { dismissed, undone } });
  return { ...result, dismissed, undone };
}

describe('ToastComponent', () => {
  it('shows a status message with an Undo button', async () => {
    const { undone } = await renderToast(deleted);

    expect(screen.getByRole('status')).toHaveTextContent('Task deleted');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(undone).toHaveBeenCalledOnce();
  });

  it('shows an error as an alert without Undo', async () => {
    await renderToast({ message: "Couldn't delete that task.", tone: 'error', undo: null });

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't delete that task.");
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  describe('timing', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('dismisses itself after 6 seconds', async () => {
      const { dismissed } = await renderToast(deleted);

      vi.advanceTimersByTime(5999);
      expect(dismissed).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(dismissed).toHaveBeenCalledOnce();
    });

    it('waits while it has focus, then gives a full 6 seconds after focus leaves', async () => {
      const { dismissed } = await renderToast(deleted);
      const undo = screen.getByRole('button', { name: 'Undo' });

      vi.advanceTimersByTime(3000);
      fireEvent.focusIn(undo);
      vi.advanceTimersByTime(10_000);
      expect(dismissed).not.toHaveBeenCalled();

      fireEvent.focusOut(undo);
      vi.advanceTimersByTime(5999);
      expect(dismissed).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(dismissed).toHaveBeenCalledOnce();
    });

    it('starts again for a new toast', async () => {
      const { dismissed, rerender } = await renderToast(deleted);

      vi.advanceTimersByTime(4000);
      await rerender({ inputs: { toast: { ...deleted, undo: { ids: ['b'] } } } });
      vi.advanceTimersByTime(4000);

      expect(dismissed).not.toHaveBeenCalled();
    });
  });
});
