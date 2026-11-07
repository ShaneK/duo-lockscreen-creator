import { test, expect } from '@playwright/test';
import { samplePhotos } from './helpers';

test('each placeholder chooses one photo and joining is a separate action', async ({ page }) => {
  await page.goto('/');
  const files = await samplePhotos(page);
  const join = page.getByRole('button', { name: 'Join Photos', exact: true });
  await expect(join).toBeDisabled();
  const portraitChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add portrait photo', exact: true }).click();
  const portrait = await portraitChooser;
  expect(portrait.isMultiple()).toBe(false);
  await portrait.setFiles(files[0]);
  await expect(page.getByRole('img', { name: 'Portrait preview', exact: true })).toBeVisible();
  await expect(join).toBeDisabled();
  const landscapeChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add landscape photo', exact: true }).click();
  const landscape = await landscapeChooser;
  expect(landscape.isMultiple()).toBe(false);
  await landscape.setFiles(files[1]);
  await expect(page.getByRole('img', { name: 'Landscape preview', exact: true })).toBeVisible();
  await expect(join).toBeEnabled();
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).not.toBeVisible();
  await join.click();
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).toHaveJSProperty('naturalWidth', 260);
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();
});

test('an unreadable photo preserves the other selection until it is corrected', async ({ page }) => {
  await page.goto('/');
  const files = await samplePhotos(page);
  await page.getByLabel('Portrait photo', { exact: true }).setInputFiles(files[0]);
  await expect(page.getByRole('img', { name: 'Portrait preview', exact: true })).toBeVisible();
  await page.getByLabel('Landscape photo', { exact: true }).setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toContainText("Couldn't open");
  await expect(page.getByRole('img', { name: 'Portrait preview', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Join Photos', exact: true })).toBeDisabled();
  await page.getByLabel('Landscape photo', { exact: true }).setInputFiles(files[1]);
  await expect(page.getByRole('button', { name: 'Join Photos', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert')).not.toBeVisible();
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).not.toBeVisible();
});

test('overlapping photo loads keep both independent selections', async ({ page }) => {
  await page.goto('/');
  const files = await samplePhotos(page);
  await page.evaluate(payloads => {
    for (const [index, payload] of payloads.entries()) {
      const input = document.querySelector<HTMLInputElement>(index === 0 ? 'input[aria-label="Portrait photo"]' : 'input[aria-label="Landscape photo"]')!;
      const transfer = new DataTransfer();
      transfer.items.add(new File([Uint8Array.from(atob(payload.data), char => char.charCodeAt(0))], payload.name, { type: 'image/png' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, files.map(file => ({ name: file.name, data: file.buffer.toString('base64') })));
  await expect(page.getByRole('img', { name: 'Portrait preview', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Landscape preview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Join Photos', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).toHaveJSProperty('naturalWidth', 260);
});
