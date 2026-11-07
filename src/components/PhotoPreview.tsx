import { useId } from 'react';
import type { PhotoSource } from '../lib/imagePipeline';

type PhotoPreviewProps = {
  photo: PhotoSource;
  label: string;
  className?: string;
};

export function PhotoPreview({ photo, label, className }: PhotoPreviewProps) {
  const clipId = `photo-crop-${useId()}`;
  const crop = photo.crop ?? { x: 0, y: 0, width: photo.width, height: photo.height };
  return <svg className={className} role="img" aria-label={label}
    viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`} preserveAspectRatio="xMidYMid meet">
    <defs><clipPath id={clipId}><rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} /></clipPath></defs>
    <image href={photo.url} width={photo.width} height={photo.height} preserveAspectRatio="none" clipPath={`url(#${clipId})`} />
  </svg>;
}
