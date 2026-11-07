import { expect, test } from '@playwright/test';

test('offers an installable app with readable home-screen icons', async ({ page }) => {
  await page.goto('/');
  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveAttribute('href', /\.webmanifest$/);

  const href = await manifestLink.getAttribute('href');
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe('Duo Lockscreen Creator');
  expect(manifest.start_url).toBe('/');
  expect(manifest.scope).toBe('/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.background_color).toBe('#faf7f4');
  expect(manifest.theme_color).toBe('#faf7f4');

  for (const size of [192, 512]) {
    const icon = manifest.icons.find((candidate: { sizes: string }) => candidate.sizes === `${size}x${size}`);
    expect(icon).toBeTruthy();
    const actualSize = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, icon.src);
    expect(actualSize).toEqual([size, size]);
  }
});
