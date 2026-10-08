// Traces to: L2-007, L2-022
import { render, screen } from '@testing-library/angular';
import { TodoHeaderComponent } from './todo-header.component';

const CIRCUMFERENCE = 2 * Math.PI * 20;

async function renderHeader(activeCount: number, completedCount: number) {
  const { container } = await render(TodoHeaderComponent, {
    inputs: { date: new Date(2026, 9, 7), activeCount, completedCount },
  });
  const fill = container.querySelector<SVGCircleElement>('[data-testid="ring-fill"]');
  const offset = Number(fill?.style.strokeDashoffset);
  return { filled: 1 - offset / CIRCUMFERENCE };
}

describe('TodoHeaderComponent progress', () => {
  it('reads "2 left" with the ring 60% filled for 2 active and 3 completed', async () => {
    const { filled } = await renderHeader(2, 3);

    expect(screen.getByTestId('progress')).toHaveTextContent('2 left');
    expect(filled).toBeCloseTo(0.6, 3);
  });

  it('reads "All done" with a full ring when every task is completed', async () => {
    const { filled } = await renderHeader(0, 4);

    expect(screen.getByTestId('progress')).toHaveTextContent('All done');
    expect(screen.getByTestId('progress')).not.toHaveTextContent('left');
    expect(filled).toBeCloseTo(1, 3);
  });

  it('reads "0 left" with an empty ring when there are no tasks', async () => {
    const { filled } = await renderHeader(0, 0);

    expect(screen.getByTestId('progress')).toHaveTextContent('0 left');
    expect(filled).toBeCloseTo(0, 3);
  });
});
