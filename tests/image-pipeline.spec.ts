import { expect, test } from '@playwright/test';

test('joins a portrait and a landscape image at a shared height without stretching', async ({ page }) => {
  await page.goto('/');
  const image = await page.evaluate(async () => {
    const modulePath = '/src/lib/imagePipeline.ts';
    const { loadPhoto, composePair, releasePhoto } = await import(modulePath);
    const makeFile = async (width: number, height: number, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      context.fillStyle = color;
      context.fillRect(0, 0, width, height);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'));
      return new File([blob], `${color}.png`, { type: 'image/png' });
    };
    const portrait = await loadPhoto(await makeFile(80, 120, 'red'));
    const landscape = await loadPhoto(await makeFile(180, 120, 'blue'));
    const result = await composePair(portrait, landscape);
    const bitmap = await createImageBitmap(result.blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const left = [...context.getImageData(40, 60, 1, 1).data];
    const right = [...context.getImageData(170, 60, 1, 1).data];
    bitmap.close();
    releasePhoto(portrait);
    releasePhoto(landscape);
    return { width: result.width, height: result.height, type: result.blob.type, left, right };
  });
  expect(image.width).toBe(260);
  expect(image.height).toBe(120);
  expect(image.type).toBe('image/jpeg');
  expect(image.left[0]).toBeGreaterThan(245);
  expect(image.left[2]).toBeLessThan(10);
  expect(image.right[2]).toBeGreaterThan(245);
  expect(image.right[0]).toBeLessThan(10);
});

test('keeps very wide image pairs within the maximum export edge', async ({ page }) => {
  await page.goto('/');
  const image = await page.evaluate(async () => {
    const modulePath = '/src/lib/imagePipeline.ts';
    const { loadPhoto, composePair, releasePhoto } = await import(modulePath);
    const canvas = document.createElement('canvas');
    canvas.width = 5000;
    canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'coral';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'));
    const photo = await loadPhoto(new File([blob], 'panorama.png', { type: 'image/png' }));
    const result = await composePair(photo, photo);
    releasePhoto(photo);
    return { width: result.width, height: result.height };
  });
  expect(image.width).toBeLessThanOrEqual(8192);
  expect(image.height).toBe(1);
});

test('honors phone-photo EXIF orientation before joining and exporting', async ({ page }) => {
  await page.goto('/');
  const image = await page.evaluate(async () => {
    const modulePath = '/src/lib/imagePipeline.ts';
    const { loadPhoto, composePair, releasePhoto } = await import(modulePath);
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 80;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'red';
    context.fillRect(0, 0, 60, 80);
    context.fillStyle = 'blue';
    context.fillRect(60, 0, 60, 80);
    const jpeg = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/jpeg', 1));
    // APP1 EXIF: orientation 6 means the stored landscape pixels display 90 degrees clockwise.
    const orientation = new Uint8Array([
      0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0,
      0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0,
      0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const photo = await loadPhoto(new File([jpeg.slice(0, 2), orientation, jpeg.slice(2)], 'phone-photo.jpg', { type: 'image/jpeg' }));
    const result = await composePair(photo, photo);
    const bitmap = await createImageBitmap(result.blob);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    context.drawImage(bitmap, 0, 0);
    const topPixel = [...context.getImageData(40, 20, 1, 1).data];
    const bottomPixel = [...context.getImageData(40, 90, 1, 1).data];
    bitmap.close();
    releasePhoto(photo);
    return { sourceWidth: photo.width, sourceHeight: photo.height, width: result.width, height: result.height, topPixel, bottomPixel };
  });
  expect(image.sourceWidth).toBe(80);
  expect(image.sourceHeight).toBe(120);
  expect(image.width).toBe(160);
  expect(image.height).toBe(120);
  expect(image.topPixel[0]).toBeGreaterThan(245);
  expect(image.topPixel[2]).toBeLessThan(10);
  expect(image.bottomPixel[2]).toBeGreaterThan(245);
  expect(image.bottomPixel[0]).toBeLessThan(10);
});

test('flattens transparent photos onto white when exporting a JPEG', async ({ page }) => {
  await page.goto('/');
  const pixel = await page.evaluate(async () => {
    const modulePath = '/src/lib/imagePipeline.ts';
    const { loadPhoto, composePair, releasePhoto } = await import(modulePath);
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'red';
    context.fillRect(0, 0, 80, 40);
    const sourceBlob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'));
    const photo = await loadPhoto(new File([sourceBlob], 'transparent.png', { type: 'image/png' }));
    const result = await composePair(photo, photo);
    const bitmap = await createImageBitmap(result.blob);
    canvas.width = bitmap.width;
    context.drawImage(bitmap, 0, 0);
    const resultPixel = [...context.getImageData(40, 90, 1, 1).data];
    bitmap.close();
    releasePhoto(photo);
    return resultPixel;
  });
  expect(pixel[0]).toBeGreaterThan(245);
  expect(pixel[1]).toBeGreaterThan(245);
  expect(pixel[2]).toBeGreaterThan(245);
});

test('keeps large exports within browser canvas memory limits', async ({ page }) => {
  await page.goto('/');
  const image = await page.evaluate(async () => {
    const modulePath = '/src/lib/imagePipeline.ts';
    const { loadPhoto, composePair, releasePhoto } = await import(modulePath);
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 3000;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'coral';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'));
    const photo = await loadPhoto(new File([blob], 'large.png', { type: 'image/png' }));
    const result = await composePair(photo, photo);
    releasePhoto(photo);
    return { width: result.width, height: result.height, size: result.blob.size };
  });
  expect(image.width * image.height).toBeLessThanOrEqual(16_000_000);
  expect(Math.max(image.width, image.height)).toBeLessThanOrEqual(8192);
  expect(image.width / image.height).toBeCloseTo(2, 2);
  expect(image.size).toBeGreaterThan(0);
});

test('exports the chosen cropped region without stretching either photo', async ({ page }) => {
  await page.goto('/');
  const image = await page.evaluate(async () => {
    const modulePath = '/src/lib/imagePipeline.ts';
    const { loadPhoto, composePair, cropRectFor, releasePhoto } = await import(modulePath);
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'red';
    context.fillRect(0, 0, 40, 120);
    context.fillStyle = '#00ff00';
    context.fillRect(40, 0, 40, 120);
    const portraitBlob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'));
    const portrait = await loadPhoto(new File([portraitBlob], 'portrait.png', { type: 'image/png' }));
    canvas.width = 180;
    context.fillStyle = 'blue';
    context.fillRect(0, 0, 180, 120);
    const landscapeBlob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'));
    const landscape = await loadPhoto(new File([landscapeBlob], 'landscape.png', { type: 'image/png' }));
    const cropped = { ...portrait, crop: cropRectFor(portrait, 2 / 3, 2, 1, 0) };
    const result = await composePair(cropped, landscape);
    const bitmap = await createImageBitmap(result.blob);
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    context.drawImage(bitmap, 0, 0);
    const portraitPixel = [...context.getImageData(20, 30, 1, 1).data];
    const landscapePixel = [...context.getImageData(80, 30, 1, 1).data];
    bitmap.close();
    releasePhoto(portrait);
    releasePhoto(landscape);
    return { width: result.width, height: result.height, portraitPixel, landscapePixel };
  });
  expect(image.width).toBe(130);
  expect(image.height).toBe(60);
  expect(image.portraitPixel[1]).toBeGreaterThan(245);
  expect(image.portraitPixel[0]).toBeLessThan(10);
  expect(image.landscapePixel[2]).toBeGreaterThan(245);
});
