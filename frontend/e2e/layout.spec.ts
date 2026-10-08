// Traces to: L2-027, L2-028
import { expect, open, test } from './support/fixtures';

const widths = [320, 375, 575, 576, 767, 768, 991, 992, 1199, 1200, 1440, 1920];

test.describe('responsive layout', () => {
  test('never scrolls sideways from 320 to 1920 px', async ({ page, api }) => {
    api.seed('A '.repeat(100).trim(), 'Short', { title: 'Done one', completed: true });
    await open(page);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${String(width)} px`).toBeLessThanOrEqual(0);
    }
  });

  test('sizes the column for each breakpoint', async ({ page, api }) => {
    api.seed('A');
    await open(page);
    const column = page.getByRole('main');

    const cases: [number, (box: { x: number; width: number }) => void][] = [
      [
        360,
        (box) => {
          expect([box.x, box.width]).toEqual([16, 328]);
        },
      ],
      [
        700,
        (box) => {
          expect([box.width, box.x]).toEqual([528, 86]);
        },
      ],
      [
        900,
        (box) => {
          expect(box.width).toBe(608);
        },
      ],
      [
        1440,
        (box) => {
          expect(box.width).toBe(608);
        },
      ],
    ];
    for (const [width, check] of cases) {
      await page.setViewportSize({ width, height: 900 });
      const card = await page.getByRole('region', { name: 'Tasks' }).boundingBox();
      if (!card) throw new Error('no card');
      check(card);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    const top = await column.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(top).toBeCloseTo(80, 0);
  });

  test('wraps a 200-character title at 320 px without covering the controls', async ({
    page,
    api,
  }) => {
    const title = 'word '.repeat(40).trim();
    api.seed(title);
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page);

    const titleBox = await page.getByRole('button', { name: `Edit ${title}` }).boundingBox();
    const deleteBox = await page.getByRole('button', { name: `Delete ${title}` }).boundingBox();
    const checkBox = await page.getByRole('checkbox', { name: title }).boundingBox();
    if (!titleBox || !deleteBox || !checkBox) throw new Error('missing row parts');

    expect(titleBox.height).toBeGreaterThan(40);
    expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(deleteBox.x);
    expect(checkBox.x + checkBox.width).toBeLessThanOrEqual(titleBox.x);
  });

  test('gives every control at least a 44 px hit area and inputs at least 16 px text', async ({
    page,
    api,
  }) => {
    api.seed('A', { title: 'B', completed: true });
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);
    await page.getByRole('button', { name: 'Delete A' }).click();
    await expect(page.getByRole('checkbox', { name: 'A' })).toHaveCount(0);

    const controls = page.locator('button, input[type=checkbox]');
    for (const control of await controls.all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      const name = await control.getAttribute('aria-label');
      expect(Math.round(box.height), `height of ${name ?? 'control'}`).toBeGreaterThanOrEqual(44);
      expect(Math.round(box.width), `width of ${name ?? 'control'}`).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole('button', { name: 'Edit B' }).click();
    for (const field of await page.getByRole('textbox').all()) {
      const size = await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(size).toBeGreaterThanOrEqual(16);
    }
  });
});

test.describe('touch devices', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 915 } });

  test('always show the delete control', async ({ page, api }) => {
    api.seed('A');
    await open(page);

    const opacity = await page
      .getByRole('button', { name: 'Delete A' })
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
  });
});
