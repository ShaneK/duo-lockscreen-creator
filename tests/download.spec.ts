import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { choosePair, samplePhotos } from './helpers';

async function openSaveSheet(page: Page, files?: Awaited<ReturnType<typeof samplePhotos>>) {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.goto('/');
  await choosePair(page, files);
  await page.getByRole('button', { name: 'Save or Share', exact: true }).click();
  return page.getByRole('dialog', { name: 'Save your photo', exact: true });
}

test('keeps the photo editor intact when the browser opens a download as an image', async ({ page }) => {
  const sheet = await openSaveSheet(page);
  const editorURL = page.url();
  await expect(sheet.getByRole('img', { name: 'Your joined photo', exact: true })).toHaveJSProperty('naturalWidth', 260);
  // Model the browser/OS boundary where `download` is ignored and the URL is opened instead.
  await page.evaluate(() => document.addEventListener('click', (event) => {
    const anchor = event.target instanceof Element ? event.target.closest('a[download]') : null;
    anchor?.removeAttribute('download');
  }, { capture: true }));
  await sheet.getByRole('link', { name: 'Download photo', exact: true }).click();
  await expect(page).toHaveURL(editorURL);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('img', { name: 'Your joined photo', exact: true })).toHaveJSProperty('naturalWidth', 260);
});

for (const fixture of ['small', 'real photos']) {
  test(`downloads a complete JPEG from ${fixture} without leaving the editor`, async ({ page }) => {
    const files = fixture === 'real photos' ? await Promise.all([
      'dog-portrait.jpg', 'coastline-landscape.jpg',
    ].map(async (name) => ({ name, mimeType: 'image/jpeg', buffer: await readFile(new URL(`./fixtures/${name}`, import.meta.url)) }))) : undefined;
    const sheet = await openSaveSheet(page, files);
    const editorURL = page.url();
    const original = page.getByRole('img', { name: 'Your two photos joined side by side', exact: true });
    const expectedDimensions = await original.evaluate((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight]);

    const downloading = page.waitForEvent('download');
    await sheet.getByRole('link', { name: 'Download photo', exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('duo-photo.jpg');
    expect(await download.failure()).toBeNull();
    const bytes = await readFile((await download.path())!);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    const dimensions = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/jpeg;base64,${base64}`;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, bytes.toString('base64'));
    expect(dimensions).toEqual(expectedDimensions);
    await expect(page).toHaveURL(editorURL);
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(original).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();
  });
}
