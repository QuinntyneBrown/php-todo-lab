// Traces to: L2-001, L2-006, L2-009, L2-012, L2-015, L2-017, L2-052
import { expect, open, test } from './support/fixtures';

const list = (page: import('@playwright/test').Page) => page.getByRole('list', { name: 'Tasks' });

test.describe('core flows', () => {
  test('add a task', async ({ page, api }) => {
    api.seed('Older');
    await open(page);

    const composer = page.getByRole('textbox', { name: 'New task' });
    await composer.fill('Buy oat milk');
    await composer.press('Enter');

    await expect(list(page).getByRole('checkbox').first()).toHaveAccessibleName('Buy oat milk');
    await expect(composer).toHaveValue('');
    await expect(page.getByTestId('progress')).toHaveText(/2\s*left/);
  });

  test('complete and reopen a task', async ({ page, api }) => {
    api.seed('Call mom', 'Buy milk');
    await open(page);

    const box = page.getByRole('checkbox', { name: 'Call mom' });
    await box.check();
    await expect(page.getByTestId('progress')).toHaveText(/1\s*left/);
    await expect.poll(() => api.todos.find((t) => t.title === 'Call mom')?.completed).toBe(true);

    await box.uncheck();
    await expect(page.getByTestId('progress')).toHaveText(/2\s*left/);
  });

  test('edit a title in place', async ({ page, api }) => {
    api.seed('Call mom');
    await open(page);

    await page.getByRole('button', { name: 'Edit Call mom' }).click();
    const editor = page.getByRole('textbox', { name: 'Edit task title' });
    await editor.fill('Call mom Sunday');
    await editor.press('Enter');

    await expect(page.getByRole('button', { name: 'Edit Call mom Sunday' })).toBeFocused();
    await expect.poll(() => api.todos[0]?.title).toBe('Call mom Sunday');
  });

  test('delete a task and undo', async ({ page, api }) => {
    api.seed('A', 'B', 'C');
    await open(page);

    await page.getByRole('button', { name: 'Delete B' }).click();
    await expect(page.getByRole('checkbox', { name: 'B' })).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Task deleted' })).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(list(page).getByRole('checkbox')).toHaveCount(3);
    await expect(list(page).getByRole('checkbox').nth(1)).toHaveAccessibleName('B');
    await expect.poll(() => api.todos.map((t) => t.title)).toEqual(['C', 'B', 'A']);
  });

  test('filter by status, mirrored in the URL', async ({ page, api }) => {
    api.seed('A', { title: 'B', completed: true }, 'C');
    await open(page);

    await page.getByRole('button', { name: /^Done/ }).click();
    await expect(page).toHaveURL(/\?filter=done$/);
    await expect(list(page).getByRole('checkbox')).toHaveCount(1);

    await page.getByRole('button', { name: /^Active/ }).click();
    await expect(list(page).getByRole('checkbox')).toHaveCount(2);

    await page.reload();
    await expect(page.getByRole('button', { name: /^Active/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('clear completed and undo', async ({ page, api }) => {
    api.seed({ title: 'A', completed: true }, 'B', { title: 'C', completed: true });
    await open(page);

    await page.getByRole('button', { name: 'Clear completed' }).click();
    await expect(list(page).getByRole('checkbox')).toHaveCount(1);
    await expect(page.getByRole('status').filter({ hasText: '2 tasks cleared' })).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(list(page).getByRole('checkbox')).toHaveCount(3);
  });
});
