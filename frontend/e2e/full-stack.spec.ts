// Traces to: L2-001, L2-009, L2-015, L2-054
import { expect, test } from '@playwright/test';

// Runs against the real Laravel API through the dev proxy. Start MySQL and
// `php artisan serve` first, then: E2E_FULL_STACK=1 npx playwright test --project=full-stack
test.skip(!process.env['E2E_FULL_STACK'], 'needs the backend; set E2E_FULL_STACK=1');

test('a task survives a reload, completes, and deletes through the real API', async ({
  page,
  request,
}) => {
  const title = `Full stack ${String(Date.now())}`;
  await page.goto('/');

  const composer = page.getByRole('textbox', { name: 'New task' });
  await composer.fill(title);
  await composer.press('Enter');
  await expect(page.getByRole('checkbox', { name: title })).toBeEnabled();

  await page.reload();
  await page.getByRole('checkbox', { name: title }).check();
  await expect(async () => {
    const list = (await (await request.get('/api/v1/todos')).json()) as {
      data: { title: string; completed: boolean }[];
    };
    expect(list.data.find((t) => t.title === title)?.completed).toBe(true);
  }).toPass();

  await page.getByRole('button', { name: `Delete ${title}` }).click();
  await expect(page.getByRole('checkbox', { name: title })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: title })).toHaveCount(0);
});
