// Segni degli elenchi puntati: disegnati come SVG (mai glifi di testo, che dipendono dal font e spesso mancano).
// Geometria condivisa tra PDF e anteprima nel pannello Style, in un riquadro 10×10.

export const BULLET_IDS = ['dot', 'ring', 'square', 'diamond', 'dash', 'arrow', 'triangle', 'check', 'bar', 'none'] as const;
export type BulletId = (typeof BULLET_IDS)[number];

export const BULLET_LABEL: Record<BulletId, string> = {
  dot: 'Dot', ring: 'Ring', square: 'Square', diamond: 'Diamond', dash: 'Dash', arrow: 'Arrow', triangle: 'Triangle', check: 'Check', bar: 'Bar', none: 'None',
};

export type BulletShape =
  | { kind: 'circle'; cx: number; cy: number; r: number; stroke?: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number }
  | { kind: 'path'; d: string; stroke?: number };

const SHAPES: Record<Exclude<BulletId, 'none'>, BulletShape> = {
  dot: { kind: 'circle', cx: 5, cy: 5, r: 2.1 },
  ring: { kind: 'circle', cx: 5, cy: 5, r: 2.3, stroke: 1.2 },
  square: { kind: 'rect', x: 2.9, y: 2.9, w: 4.2, h: 4.2 },
  diamond: { kind: 'path', d: 'M5 1.8 L8.2 5 L5 8.2 L1.8 5 Z' },
  dash: { kind: 'rect', x: 1.6, y: 4.35, w: 6.8, h: 1.3, rx: 0.65 },
  arrow: { kind: 'path', d: 'M3.4 2 L6.8 5 L3.4 8', stroke: 1.5 },
  triangle: { kind: 'path', d: 'M2.8 1.8 L8.2 5 L2.8 8.2 Z' },
  check: { kind: 'path', d: 'M1.8 5.3 L4.2 7.6 L8.3 2.6', stroke: 1.6 },
  bar: { kind: 'rect', x: 3.9, y: 1.6, w: 2.2, h: 6.8, rx: 1.1 },
};

/** Forma del segno; `null` per "nessun segno" o valori sconosciuti di documenti vecchi (si usa il punto). */
export function bulletShape(id: string): BulletShape | null {
  if (id === 'none') return null;
  return (SHAPES as Record<string, BulletShape>)[id] ?? SHAPES.dot;
}
