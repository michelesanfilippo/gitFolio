import { describe, expect, it } from 'vitest';
import { computeCrop, PHOTO_MAX_BYTES, validatePhotoFile } from '@/core/photo/crop';

describe('computeCrop', () => {
  it('centres a square on a landscape image at zoom 1', () => {
    expect(computeCrop(1600, 900, 1, 0, 0)).toEqual({ side: 900, sx: 350, sy: 0 });
  });
  it('centres on portrait images', () => {
    expect(computeCrop(900, 1600, 1, 0, 0)).toEqual({ side: 900, sx: 0, sy: 350 });
  });
  it('zooms in and shifts within bounds', () => {
    const c = computeCrop(1000, 1000, 2, 1, -1);
    expect(c).toEqual({ side: 500, sx: 500, sy: 0 });
    expect(c.sx + c.side).toBeLessThanOrEqual(1000);
  });
  it('clamps out-of-range focus and zoom < 1', () => {
    const c = computeCrop(1000, 800, 0.2, 9, -9);
    expect(c.side).toBe(800);
    expect(c.sx).toBe(200); // (1000-800)/2 * (1+1)
    expect(c.sy).toBe(0);
  });
});

describe('validatePhotoFile', () => {
  it('accepts jpeg/png/webp', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(validatePhotoFile({ type, size: 1000 })).toBeNull();
  });
  it('rejects other types (svg can carry scripts), and oversize', () => {
    expect(validatePhotoFile({ type: 'image/svg+xml', size: 10 })).toBe('type');
    expect(validatePhotoFile({ type: 'application/pdf', size: 10 })).toBe('type');
    expect(validatePhotoFile({ type: 'image/png', size: PHOTO_MAX_BYTES + 1 })).toBe('size');
  });
});
