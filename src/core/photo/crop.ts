export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_OUTPUT_PX = 480;

export type PhotoError = 'type' | 'size' | 'decode';

/** Validazione preliminare del file scelto dall'utente (tipo e peso). */
export function validatePhotoFile(file: { type: string; size: number }): PhotoError | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > PHOTO_MAX_BYTES) return 'size';
  return null;
}

export interface Crop { sx: number; sy: number; side: number }

/**
 * Ritaglio quadrato. `zoom` >= 1 (1 = lato più corto intero), `fx`/`fy` in [-1, 1] spostano
 * la finestra di ritaglio sull'asse con margine (0 = centrata).
 */
export function computeCrop(width: number, height: number, zoom: number, fx: number, fy: number): Crop {
  const z = Math.max(1, zoom);
  const side = Math.min(width, height) / z;
  const clamp = (v: number) => Math.min(1, Math.max(-1, v));
  return {
    side,
    sx: ((width - side) / 2) * (1 + clamp(fx)),
    sy: ((height - side) / 2) * (1 + clamp(fy)),
  };
}
