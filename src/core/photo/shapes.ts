export type PhotoShape = 'square' | 'rounded' | 'squircle' | 'circle' | 'arch' | 'leaf' | 'portrait';

export interface ShapeDef {
  label: string;
  /** larghezza / altezza (<= 1: `size` è sempre l'altezza) */
  aspect: number;
  /** raggi [alto-sx, alto-dx, basso-dx, basso-sx] in funzione della larghezza w */
  radii: (w: number) => [number, number, number, number];
}

// Solo forme ottenibili con angoli arrotondati: il motore PDF non supporta maschere arbitrarie (esagono, rombo...).
export const PHOTO_SHAPES: Record<PhotoShape, ShapeDef> = {
  square: { label: 'Square', aspect: 1, radii: () => [0, 0, 0, 0] },
  rounded: { label: 'Rounded', aspect: 1, radii: (w) => [w * 0.14, w * 0.14, w * 0.14, w * 0.14] },
  squircle: { label: 'Soft', aspect: 1, radii: (w) => [w * 0.3, w * 0.3, w * 0.3, w * 0.3] },
  circle: { label: 'Circle', aspect: 1, radii: (w) => [w / 2, w / 2, w / 2, w / 2] },
  portrait: { label: 'Portrait', aspect: 0.8, radii: (w) => [w * 0.12, w * 0.12, w * 0.12, w * 0.12] },
  arch: { label: 'Arch', aspect: 0.8, radii: (w) => [w / 2, w / 2, 0, 0] },
  leaf: { label: 'Leaf', aspect: 1, radii: (w) => [w / 2, 0, w / 2, 0] },
};

export const PHOTO_SHAPE_IDS = Object.keys(PHOTO_SHAPES) as PhotoShape[];

export const shapeBox = (shape: PhotoShape, size: number) => {
  const def = PHOTO_SHAPES[shape];
  const width = size * def.aspect;
  return { width, height: size, radii: def.radii(width) };
};
