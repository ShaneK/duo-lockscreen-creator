import { expect, test, type Page } from '@playwright/test';
import { choosePair } from './helpers';

async function choosePrecisionPair(page: Page) {
  const images = await page.evaluate(() => ['#cc4530', '#264e72'].map(color => {
    const canvas = document.createElement('canvas');
    canvas.width = 706;
    canvas.height = 700;
    const context = canvas.getContext('2d')!;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#669944';
    context.fillRect(353, 0, 353, 350);
    return canvas.toDataURL('image/png').split(',')[1];
  }));
  await choosePair(page, images.map((data, index) => ({
    name: `photo-${index}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  })));
}

async function applyCrop(page: Page, width: number, height: number) {
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  const previousSource = await output.getAttribute('src');
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(output).not.toHaveAttribute('src', previousSource!);
  await expect(output).toHaveJSProperty('naturalWidth', width);
  await expect(output).toHaveJSProperty('naturalHeight', height);
}

test('unchanged crops and Reset preserve the original export dimensions', async ({ page }) => {
  await page.goto('/');
  await choosePrecisionPair(page);
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  await expect(output).toHaveJSProperty('naturalWidth', 1412);
  await expect(output).toHaveJSProperty('naturalHeight', 700);

  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await applyCrop(page, 1412, 700);

  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByLabel('Crop shape').selectOption('square');
  await page.getByLabel('Crop shape').selectOption('current');
  await applyCrop(page, 1412, 700);

  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByLabel('Crop shape').selectOption('square');
  await applyCrop(page, 1406, 700);

  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByRole('button', { name: 'Reset crop', exact: true }).click();
  await applyCrop(page, 1412, 700);
});

test('reapplying saved zoom and position preserves the exported framing', async ({ page }) => {
  await page.goto('/');
  await choosePrecisionPair(page);
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByLabel('Zoom', { exact: true }).focus();
  await page.getByLabel('Zoom', { exact: true }).press('End');
  await page.getByLabel('Left or right', { exact: true }).focus();
  await page.getByLabel('Left or right', { exact: true }).press('End');
  await page.getByLabel('Up or down', { exact: true }).focus();
  await page.getByLabel('Up or down', { exact: true }).press('Home');
  await applyCrop(page, 354, 175);

  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  const pixels = () => output.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  });
  const savedPixels = await pixels();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByRole('button', { name: 'Crop', exact: true }).click();
    await page.getByLabel('Crop shape').selectOption('square');
    await page.getByLabel('Crop shape').selectOption('current');
    await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('4');
    await expect(page.getByLabel('Left or right', { exact: true })).toHaveValue('1');
    await expect(page.getByLabel('Up or down', { exact: true })).toHaveValue('-1');
    await applyCrop(page, 354, 175);
    expect(await pixels()).toBe(savedPixels);
  }
});
