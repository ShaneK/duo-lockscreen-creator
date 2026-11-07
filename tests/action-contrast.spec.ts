import { expect, test, type Locator } from '@playwright/test';
import { choosePair } from './helpers';

function luminance(color: string) {
  const channels = color.startsWith('#')
    ? color.slice(1).match(/../g)!.map(value => parseInt(value, 16))
    : color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const [red, green, blue] = channels.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

async function contrast(locator: Locator, background?: string) {
  const colors = await locator.evaluate(element => {
    const style = getComputedStyle(element);
    return { foreground: style.color, background: style.backgroundColor };
  });
  const values = [luminance(colors.foreground), luminance(background ?? colors.background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('smaller action labels meet the 4.5 to 1 normal-text contrast requirement', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.goto('/');
  await choosePair(page);
  await page.mouse.move(0, 0);
  const paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  expect.soft(await contrast(page.getByRole('button', { name: 'New', exact: true }), paper), 'New label contrast').toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button', { name: 'Save or Share', exact: true }).click();
  const save = page.getByRole('dialog', { name: 'Save your photo', exact: true });
  const download = save.getByRole('link', { name: 'Download photo', exact: true });
  await expect(download).toBeVisible();
  await page.mouse.move(0, 0);
  expect.soft(await contrast(download), 'Download label contrast').toBeGreaterThanOrEqual(4.5);
  await save.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.mouse.move(0, 0);
  expect.soft(await contrast(page.getByRole('button', { name: 'Apply crop', exact: true })), 'Apply crop label contrast').toBeGreaterThanOrEqual(4.5);
});
