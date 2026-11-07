import { test, expect } from '@playwright/test';
import { choosePair } from '../helpers';

test('the production app can reload and join new photos while offline', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Pick two photos.' })).toBeVisible();
  await choosePair(page);
  await expect(page.getByRole('img', { name: 'Your two photos joined side by side', exact: true })).toHaveJSProperty('naturalWidth', 260);
  await expect(page.getByRole('button', { name: 'Save or Share', exact: true })).toBeEnabled();
});


test('the hosted app keeps its manifest, icons, and service worker within its path', async ({ page, baseURL }) => {
  await page.goto('./');
  const appURL = new URL(baseURL!);
  const appPath = appURL.pathname;
  const manifestURL = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestResponse = await page.request.get(new URL(manifestURL!, page.url()).href);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  for (const field of ['id', 'start_url', 'scope']) expect(manifest[field]).toBe(appPath);
  for (const icon of manifest.icons) {
    const iconURL = new URL(icon.src, manifestResponse.url());
    expect(iconURL.pathname.startsWith(appPath)).toBe(true);
    const response = await page.request.get(iconURL.href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/');
  }
  const registration = await page.evaluate(async () => {
    const worker = await navigator.serviceWorker.ready;
    return { scope: worker.scope, script: worker.active?.scriptURL };
  });
  expect(registration.scope).toBe(appURL.href);
  expect(registration.script).toBe(new URL('sw.js', appURL).href);
});
