import { expect, test, type Locator, type Page } from '@playwright/test';
import { samplePhotos, selectPair } from './helpers';

async function pixelFromPreview(page: Page, preview: Locator, horizontal = 0.25) {
  const screenshot = await preview.screenshot();
  return page.evaluate(async ({ base64, horizontal }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [...context.getImageData(Math.floor(canvas.width * horizontal), Math.floor(canvas.height / 2), 1, 1).data];
  }, { base64: screenshot.toString('base64'), horizontal });
}

test('retained photo previews show the crop that will be joined after replacing the other photo', async ({ page }) => {
  await page.goto('/');
  const files = await samplePhotos(page);
  const patternedLandscape = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 120, 120);
    context.fillStyle = '#0000ff';
    context.fillRect(120, 0, 60, 120);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  files[1] = { name: 'patterned-landscape.png', mimeType: 'image/png', buffer: Buffer.from(patternedLandscape, 'base64') };
  await selectPair(page, files);
  const originalPixel = await pixelFromPreview(page, page.getByRole('img', { name: 'Landscape preview', exact: true }));
  expect(originalPixel[0], 'an uncropped preview must still show the original red area').toBeGreaterThan(220);
  expect(originalPixel[2]).toBeLessThan(30);
  await page.getByRole('button', { name: 'Join Photos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();

  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  const crop = page.getByRole('dialog', { name: 'Crop your photos', exact: true });
  await crop.getByRole('button', { name: 'Right photo', exact: true }).click();
  await crop.getByLabel('Crop shape').selectOption('square');
  await crop.getByLabel('Zoom', { exact: true }).press('End');
  await crop.getByLabel('Left or right', { exact: true }).press('End');
  await crop.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();

  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  const thumbnailPixel = await pixelFromPreview(page, page.getByRole('img', { name: 'Right photo preview', exact: true }));
  expect(thumbnailPixel[0], 'the replacement thumbnail must exclude the red area outside the saved crop').toBeLessThan(30);
  expect(thumbnailPixel[2]).toBeGreaterThan(220);
  await page.getByRole('button', { name: 'Left photo', exact: true }).click();
  await page.getByLabel('Replace selected photo', { exact: true }).setInputFiles(files[0]);
  await expect(page.getByRole('button', { name: 'Join Photos', exact: true })).toBeEnabled();

  const preview = page.getByRole('img', { name: 'Landscape preview', exact: true });
  const pixel = await pixelFromPreview(page, preview);
  expect(pixel[0], 'the retained preview must exclude the red portion outside the saved crop').toBeLessThan(30);
  expect(pixel[2], 'the retained preview must show the blue portion inside the saved crop').toBeGreaterThan(220);
  const letterboxPixel = await pixelFromPreview(page, preview, 0.1);
  expect(Math.abs(letterboxPixel[0] - letterboxPixel[2]), 'letterboxing must not expose source pixels outside the crop').toBeLessThan(30);
  expect(letterboxPixel[2]).toBeGreaterThan(180);
});
