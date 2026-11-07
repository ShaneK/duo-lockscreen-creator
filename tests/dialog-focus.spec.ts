import { expect, test } from '@playwright/test';
import { choosePair } from './helpers';

for (const dismiss of ['Close', 'Escape']) {
  test('closing Crop with ' + dismiss + ' returns keyboard focus to its opener', async ({ page }) => {
    await page.goto('/');
    await choosePair(page);
    const trigger = page.getByRole('button', { name: 'Crop', exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Crop your photos', exact: true });
    await expect(dialog).toBeVisible();
    if (dismiss === 'Escape') await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
}

test('closing the save sheet returns focus to Save or Share', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.goto('/');
  await choosePair(page);
  const trigger = page.getByRole('button', { name: 'Save or Share', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  await page.getByRole('dialog', { name: 'Save your photo' }).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(trigger).toBeFocused();
});

test('applying a crop focuses the updated result instead of a disabled trigger', async ({ page }) => {
  await page.goto('/');
  await choosePair(page);
  await page.getByRole('button', { name: 'Crop', exact: true }).click();
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is ready', exact: true })).toBeFocused();
});

test('replacing a photo focuses its selection control after decoding', async ({ page }) => {
  await page.goto('/');
  const pair = await choosePair(page);
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Left photo', exact: true }).click();
  await (await chooser).setFiles(pair[0]);
  await expect(page.getByRole('button', { name: 'Change portrait photo', exact: true })).toBeFocused();
});

test('a dialog opened without a focused trigger returns to the result heading', async ({ page }) => {
  await page.goto('/');
  await choosePair(page);
  // Safari pointer activation and assistive activation need not focus the trigger.
  await page.getByRole('button', { name: 'Crop', exact: true }).evaluate((button: HTMLButtonElement) => {
    let focused = document.activeElement;
    while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement;
    if (focused instanceof HTMLElement) focused.blur();
    button.click();
  });
  const dialog = page.getByRole('dialog', { name: 'Crop your photos', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is ready', exact: true })).toBeFocused();
});
