import { computeCrop, PHOTO_OUTPUT_PX } from './crop';

export interface PhotoSource { bitmap: ImageBitmap }

/** Decodifica rispettando l'orientamento EXIF. Lancia se il file non è un'immagine valida. */
export async function loadPhoto(file: File): Promise<PhotoSource> {
  return { bitmap: await createImageBitmap(file, { imageOrientation: 'from-image' }) };
}

/** Ritaglia a quadrato, ridimensiona (max 480 px) e codifica JPEG: leggero da incorporare nel PDF. */
export function renderPhoto(src: PhotoSource, zoom: number, fx: number, fy: number): string {
  const { width, height } = src.bitmap;
  const crop = computeCrop(width, height, zoom, fx, fy);
  const out = Math.min(PHOTO_OUTPUT_PX, Math.round(crop.side));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.fillStyle = '#FFFFFF'; // PNG/WebP trasparenti: sfondo bianco (JPEG non ha alpha)
  ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src.bitmap, crop.sx, crop.sy, crop.side, crop.side, 0, 0, out, out);
  return canvas.toDataURL('image/jpeg', 0.88);
}
