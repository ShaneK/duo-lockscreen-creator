import { test, expect } from '@playwright/test';
import { samplePhotos, choosePair } from './helpers';

test('a user can choose a portrait and a landscape and get one joined image', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pick two photos.' })).toBeVisible();
  await choosePair(page);
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  await expect(output).toBeVisible();
  await expect(output).toHaveJSProperty('naturalWidth', 260);
  await expect(output).toHaveJSProperty('naturalHeight', 120);
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();
});

test('Save or Share passes the finished image file to the system share sheet', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => {
      const file = data.files![0];
      const image = await createImageBitmap(file);
      (window as unknown as { sharedImage: unknown }).sharedImage = { name: file.name, type: file.type, width: image.width, height: image.height };
      image.close();
    } });
  });
  await page.goto('/');
  await choosePair(page);
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save or Share', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { sharedImage: unknown }).sharedImage)).toEqual({ name: 'duo-photo.jpg', type: 'image/jpeg', width: 260, height: 120 });
  await expect(page.getByRole('heading', { name: 'Your photo is ready' })).toBeVisible();
});

test('a user can swap the photos without changing their proportions', async ({ page }) => {
  await page.goto('/');
  await choosePair(page);
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  await expect(output).toBeVisible();
  await page.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(output).toHaveJSProperty('naturalWidth', 260);
  const firstPixel = await output.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(5, 5, 1, 1).data];
  });
  expect(firstPixel[2]).toBeGreaterThan(firstPixel[0]);
});

test('when native sharing is unavailable the full image can still be saved', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.goto('/');
  await choosePair(page);
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save or Share', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Save your photo', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img', { name: 'Your joined photo' })).toHaveJSProperty('naturalWidth', 260);
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'Download photo' }).click();
  expect((await download).suggestedFilename()).toBe('duo-photo.jpg');
});

test('a user can replace one photo without losing the other', async ({ page }) => {
  await page.goto('/');
  const pair = await samplePhotos(page);
  await choosePair(page, pair);
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await page.getByRole('button', { name: 'Right photo', exact: true }).click();
  await page.getByLabel('Replace selected photo', { exact: true }).setInputFiles(pair[0]);
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Join Photos', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).toHaveJSProperty('naturalWidth', 160);
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).toHaveJSProperty('naturalHeight', 120);
});

test('a crop changes the exported image and can be reset to the original', async ({ page }) => {
  await page.goto('/');
  await choosePair(page);
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  await expect(output).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crop', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  const crop = page.getByRole('dialog', { name: 'Crop your photos' });
  await crop.getByLabel('Crop shape').selectOption('square');
  await crop.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(output).toHaveJSProperty('naturalWidth', 200);
  await expect(output).toHaveJSProperty('naturalHeight', 80);
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByRole('button', { name: 'Reset crop', exact: true }).click();
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(output).toHaveJSProperty('naturalWidth', 260);
  await expect(output).toHaveJSProperty('naturalHeight', 120);
});

test('a failed selection preserves the current pair and New clears it', async ({ page }) => {
  await page.goto('/');
  const pair = await samplePhotos(page);
  const picker = page.getByLabel('Landscape photo', { exact: true });
  await choosePair(page, pair);
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  await expect(output).toBeVisible();
  await picker.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText("Couldn't open");
  await expect(output).toHaveJSProperty('naturalWidth', 260);
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(output).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Join Photos', exact: true })).toBeDisabled();
  await expect(page.getByRole('alert')).not.toBeVisible();
});

test('canceling a crop or share leaves the finished image available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Canceled', 'AbortError'); } });
  });
  await page.goto('/');
  await choosePair(page);
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  await expect(output).toBeVisible();
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  const crop = page.getByRole('dialog', { name: 'Crop your photos' });
  await crop.getByLabel('Crop shape').selectOption('square');
  await crop.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(output).toHaveJSProperty('naturalWidth', 260);
  await page.getByRole('button', { name: 'Save or Share', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).not.toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('Current crop restores the saved zoom and position after exploring another shape', async ({ page }) => {
  await page.goto('/');
  await choosePair(page);
  const output = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
  await expect(output).toBeVisible();
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByLabel('Zoom', { exact: true }).focus();
  await page.getByLabel('Zoom', { exact: true }).press('End');
  await page.getByLabel('Left or right', { exact: true }).focus();
  await page.getByLabel('Left or right', { exact: true }).press('End');
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(output).toHaveJSProperty('naturalWidth', 65);
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByLabel('Crop shape').selectOption('square');
  await page.getByLabel('Crop shape').selectOption('current');
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('Left or right', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(output).toHaveJSProperty('naturalWidth', 65);
  await expect(output).toHaveJSProperty('naturalHeight', 30);
});
