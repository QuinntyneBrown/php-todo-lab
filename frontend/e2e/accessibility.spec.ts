// Traces to: L2-030, L2-052
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { ApiError } from '../src/app/core/api/api-error';
import { expect, open, test } from './support/fixtures';

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe in the ${colorScheme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme });
    });

    test('loaded', async ({ page, api }) => {
      api.seed('A', { title: 'B', completed: true });
      await open(page);
      await expectNoViolations(page);
    });

    test('empty', async ({ page, api }) => {
      expect(api.todos).toEqual([]);
      await open(page);
      await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
      await expectNoViolations(page);
    });

    test('loading', async ({ page, api }) => {
      api.hold();
      await page.goto('/');
      await expect(page.getByTestId('skeleton')).toBeVisible();
      await expectNoViolations(page);
    });

    test('error', async ({ page, api }) => {
      for (let attempt = 0; attempt < 3; attempt++)
        api.failNext('list', new ApiError('server', 500));
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expectNoViolations(page);
    });

    test('editing', async ({ page, api }) => {
      api.seed('A');
      await open(page);
      await page.getByRole('button', { name: 'Edit A' }).click();
      await expect(page.getByRole('textbox', { name: 'Edit task title' })).toBeFocused();
      await expectNoViolations(page);
    });

    test('toast visible', async ({ page, api }) => {
      api.seed('A', 'B');
      await open(page);
      await page.getByRole('button', { name: 'Delete A' }).click();
      await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
