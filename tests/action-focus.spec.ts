import { expect, test } from '@playwright/test';
import { choosePair, selectPair } from './helpers';

test('joining photos moves keyboard focus to the completed result', async ({ page }) => {
  await page.goto('/');
  await selectPair(page);
  const join = page.getByRole('button', { name: 'Join Photos', exact: true });
  await expect(join).toBeEnabled();
  await join.focus();
  await join.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your photo is ready', exact: true })).toBeFocused();
});

test('swapping photos restores keyboard focus to Swap', async ({ page }) => {
  await page.goto('/');
  await choosePair(page);
  const swap = page.getByRole('button', { name: 'Swap', exact: true });
  await swap.focus();
  await swap.press('Enter');
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();
  await expect(swap).toBeFocused();
});

test('New focuses the first photo picker', async ({ page }) => {
  await page.goto('/');
  await choosePair(page);
  const start = page.getByRole('button', { name: 'New', exact: true });
  await start.focus();
  await start.press('Enter');
  await expect(page.getByRole('button', { name: 'Add portrait photo', exact: true })).toBeFocused();
});

for (const outcome of ['complete', 'cancel']) {
  test('native share ' + outcome + ' restores focus to Save or Share', async ({ page }) => {
    await page.addInitScript(result => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        (window as unknown as { shareSettled: boolean }).shareSettled = true;
        if (result === 'cancel') throw new DOMException('Canceled', 'AbortError');
      } });
    }, outcome);
    await page.goto('/');
    await choosePair(page);
    const share = page.getByRole('button', { name: 'Save or Share', exact: true });
    await share.focus();
    await share.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as unknown as { shareSettled: boolean }).shareSettled)).toBe(true);
    await expect(share).toBeEnabled();
    await expect(share).toBeFocused();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}
