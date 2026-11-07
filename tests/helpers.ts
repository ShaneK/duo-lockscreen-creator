import type { Page } from '@playwright/test';

export async function samplePhotos(page: Page) {
  const images = await page.evaluate(() => {
    return [[80, 120, '#cc4530'], [180, 120, '#264e72']].map(([width, height, color]) => {
      const canvas = document.createElement('canvas');
      canvas.width = Number(width);
      canvas.height = Number(height);
      const context = canvas.getContext('2d')!;
      context.fillStyle = String(color);
      context.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png').split(',')[1];
    });
  });
  return images.map((data, index) => ({
    name: index === 0 ? 'portrait.png' : 'landscape.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  }));
}

export async function selectPair(page: Page, files?: Awaited<ReturnType<typeof samplePhotos>>) {
  const pair = files ?? await samplePhotos(page);
  await page.getByLabel('Portrait photo', { exact: true }).setInputFiles(pair[0]);
  await page.getByLabel('Landscape photo', { exact: true }).setInputFiles(pair[1]);
  await page.getByRole('img', { name: 'Portrait preview', exact: true }).waitFor();
  await page.getByRole('img', { name: 'Landscape preview', exact: true }).waitFor();
  return pair;
}

export async function choosePair(page: Page, files?: Awaited<ReturnType<typeof samplePhotos>>) {
  const pair = await selectPair(page, files);
  await page.getByRole('button', { name: 'Join Photos', exact: true }).click();
  await page.getByRole('img', { name: 'Your two photos joined side by side', exact: true }).waitFor();
  return pair;
}
