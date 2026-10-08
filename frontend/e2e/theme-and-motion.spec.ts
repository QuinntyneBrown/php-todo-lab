// Traces to: L2-011, L2-024, L2-026, L2-030
import { expect, open, test } from './support/fixtures';

const background = (page: import('@playwright/test').Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('theme', () => {
  test('renders the dark tokens when the OS is dark', async ({ page, api }) => {
    api.seed('A');
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);

    expect(await background(page)).toBe('rgb(11, 20, 27)');
  });

  test('renders the light tokens when the OS is light', async ({ page, api }) => {
    api.seed('A');
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);

    expect(await background(page)).toBe('rgb(233, 238, 243)');
  });
});

test.describe('motion', () => {
  test('animates nothing on load once the list is in', async ({ page, api }) => {
    api.seed('A', 'B');
    await open(page);

    const running = await page.evaluate(() =>
      document.getAnimations().map((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        const what =
          animation instanceof CSSTransition
            ? animation.transitionProperty
            : (animation as CSSAnimation).animationName;
        return `${what} on ${target instanceof Element ? target.className : '?'}`;
      }),
    );
    expect(running).toEqual([]);
  });

  test('completes a task with no animation when motion is reduced', async ({ page, api }) => {
    api.seed('A');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);

    await page.getByRole('checkbox', { name: 'A' }).check();

    const animations = await page.evaluate(() =>
      document
        .getAnimations()
        .map((a) => (a.effect?.getComputedTiming().duration as number | undefined) ?? 0)
        .filter((duration) => duration > 100),
    );
    expect(animations).toEqual([]);
    const strike = await page
      .getByRole('button', { name: 'Edit A' })
      .locator('.title__text')
      .evaluate((el) => getComputedStyle(el).backgroundSize);
    expect(strike).toBe('100% 2px');
  });

  test('plays the completion burst within 500 ms when motion is allowed', async ({ page, api }) => {
    api.seed('A');
    await open(page);

    await page.getByRole('checkbox', { name: 'A' }).check();

    const longest = await page.evaluate(() =>
      Math.max(
        0,
        ...document.getAnimations().map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0)),
      ),
    );
    expect(longest).toBeGreaterThan(0);
    expect(longest).toBeLessThanOrEqual(500);
  });
});

test.describe('focus', () => {
  test('shows a 2 px focus ring with a 2 px offset on keyboard focus', async ({ page, api }) => {
    api.seed('A');
    await open(page);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return [style.outlineStyle, style.outlineWidth, style.outlineOffset];
    });

    expect(ring).toEqual(['solid', '2px', '2px']);
  });
});
