export type CropRect = { x: number; y: number; width: number; height: number };

export type PhotoSource = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  crop?: CropRect;
};

async function decodeImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export async function loadPhoto(file: File): Promise<PhotoSource> {
  const url = URL.createObjectURL(file);
  try {
    const image = await decodeImage(url);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      url,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Couldn't open that photo. Try a JPEG or PNG.");
  }
}

export async function composePair(first: PhotoSource, second: PhotoSource): Promise<{ blob: Blob; width: number; height: number }> {
  const images = await Promise.all([decodeImage(first.url), decodeImage(second.url)]);
  const firstCrop = first.crop ?? { x: 0, y: 0, width: first.width, height: first.height };
  const secondCrop = second.crop ?? { x: 0, y: 0, width: second.width, height: second.height };
  const firstAspect = firstCrop.width / firstCrop.height;
  const secondAspect = secondCrop.width / secondCrop.height;
  const totalAspect = firstAspect + secondAspect;
  const maximumHeight = Math.min(
    firstCrop.height,
    secondCrop.height,
    8192,
    8192 / totalAspect,
    Math.sqrt(16_000_000 / totalAspect),
  );
  // Ratio round trips can leave an integer height a few floating-point steps below itself.
  let height = Math.max(1, Math.floor(maximumHeight + Number.EPSILON * maximumHeight * 8));
  let firstWidth = Math.max(1, Math.round(firstAspect * height));
  let secondWidth = Math.max(1, Math.round(secondAspect * height));
  while (height > 1 && ((firstWidth + secondWidth) * height > 16_000_000 || firstWidth + secondWidth > 8192)) {
    height -= 1;
    firstWidth = Math.max(1, Math.round(firstAspect * height));
    secondWidth = Math.max(1, Math.round(secondAspect * height));
  }
  if (firstWidth + secondWidth > 8192) {
    firstWidth = Math.max(1, Math.min(8191, Math.round(8192 * firstAspect / totalAspect)));
    secondWidth = 8192 - firstWidth;
  }
  const canvas = document.createElement('canvas');
  canvas.width = firstWidth + secondWidth;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("Your browser couldn't join these photos.");
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(images[0], firstCrop.x, firstCrop.y, firstCrop.width, firstCrop.height, 0, 0, firstWidth, height);
  context.drawImage(images[1], secondCrop.x, secondCrop.y, secondCrop.width, secondCrop.height, firstWidth, 0, secondWidth, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Your browser couldn't export this photo.")), 'image/jpeg', 0.95);
  });
  return { blob, width: canvas.width, height: canvas.height };
}

export function cropRectFor(photo: Pick<PhotoSource, 'width' | 'height'>, aspect: number, zoom: number, panX: number, panY: number): CropRect {
  const width = Math.min(photo.width, photo.height * aspect) / zoom;
  const height = width / aspect;
  return {
    x: (photo.width - width) * (panX + 1) / 2,
    y: (photo.height - height) * (panY + 1) / 2,
    width,
    height,
  };
}

export function releasePhoto(photo: PhotoSource): void {
  URL.revokeObjectURL(photo.url);
}
