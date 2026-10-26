// Pattern decorativi di sfondo. Funzioni pure: stesse forme per il PDF (react-pdf Svg) e per le anteprime DOM.

export type PatternKind =
  | 'none' | 'dashes' | 'dots' | 'rings' | 'stars' | 'sparkles' | 'leaves'
  | 'waves' | 'zigzag' | 'plus' | 'triangles' | 'diamonds' | 'chevrons';
export type PatternAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'full';

export interface PatternSettings {
  kind: PatternKind;
  anchor: PatternAnchor;
  /** Colore esadecimale; vuoto = colore d'accento della palette. */
  color: string;
  /** Opacità massima (0..1): quanto il pattern è visibile. */
  visibility: number;
  /** 0..1: quanto il pattern sfuma allontanandosi dall'angolo/bordo di ancoraggio. */
  fade: number;
  /** Dimensione di ogni elemento (pt). */
  size: number;
  /** Distanza tra elementi, in multipli di `size`. */
  spacing: number;
  /** Ingombro della zona, in % della larghezza/altezza pagina (ignorato dove non applicabile). */
  widthPct: number;
  heightPct: number;
}

export const PATTERN_KINDS: PatternKind[] = ['none', 'dashes', 'dots', 'rings', 'stars', 'sparkles', 'leaves', 'waves', 'zigzag', 'plus', 'triangles', 'diamonds', 'chevrons'];
export const PATTERN_ANCHORS: PatternAnchor[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'full'];

export const defaultPattern: PatternSettings = {
  kind: 'none', anchor: 'top-right', color: '', visibility: 0.3, fade: 0.6, size: 20, spacing: 2, widthPct: 50, heightPct: 40,
};

export type PatternShape =
  | { type: 'path'; d: string; fill: boolean; strokeWidth: number; opacity: number }
  | { type: 'circle'; cx: number; cy: number; r: number; fill: boolean; strokeWidth: number; opacity: number };

export interface Region { x: number; y: number; width: number; height: number }

export function patternRegion(s: PatternSettings, pageW: number, pageH: number): Region {
  const w = (pageW * s.widthPct) / 100;
  const h = (pageH * s.heightPct) / 100;
  switch (s.anchor) {
    case 'top-left': return { x: 0, y: 0, width: w, height: h };
    case 'top-right': return { x: pageW - w, y: 0, width: w, height: h };
    case 'bottom-left': return { x: 0, y: pageH - h, width: w, height: h };
    case 'bottom-right': return { x: pageW - w, y: pageH - h, width: w, height: h };
    case 'top': return { x: 0, y: 0, width: pageW, height: h };
    case 'bottom': return { x: 0, y: pageH - h, width: pageW, height: h };
    default: return { x: 0, y: 0, width: pageW, height: pageH };
  }
}

type Cmd = ['M' | 'L', number, number] | ['Q', number, number, number, number] | ['Z'];

const star = (points: number, outer: number, inner: number): Cmd[] => {
  const out: Cmd[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    out.push([i === 0 ? 'M' : 'L', Math.cos(a) * r, Math.sin(a) * r]);
  }
  out.push(['Z']);
  return out;
};

/** Forme in coordinate unitarie [-0.5, 0.5]. `fill=false` = solo contorno. */
const SHAPES: Record<Exclude<PatternKind, 'none' | 'dots' | 'rings'>, { cmds: Cmd[]; fill: boolean; stroke: number }> = {
  dashes: { cmds: [['M', -0.5, 0], ['L', 0.5, 0]], fill: false, stroke: 0.12 },
  stars: { cmds: star(5, 0.5, 0.2), fill: true, stroke: 0 },
  sparkles: { cmds: star(4, 0.5, 0.12), fill: true, stroke: 0 },
  leaves: { cmds: [['M', 0, -0.5], ['Q', 0.5, -0.1, 0, 0.5], ['Q', -0.5, -0.1, 0, -0.5], ['Z']], fill: true, stroke: 0 },
  waves: { cmds: [['M', -0.5, 0], ['Q', -0.25, -0.4, 0, 0], ['Q', 0.25, 0.4, 0.5, 0]], fill: false, stroke: 0.1 },
  zigzag: { cmds: [['M', -0.5, 0.2], ['L', -0.25, -0.2], ['L', 0, 0.2], ['L', 0.25, -0.2], ['L', 0.5, 0.2]], fill: false, stroke: 0.1 },
  plus: { cmds: [['M', 0, -0.4], ['L', 0, 0.4], ['M', -0.4, 0], ['L', 0.4, 0]], fill: false, stroke: 0.12 },
  triangles: { cmds: [['M', 0, -0.4], ['L', 0.4, 0.32], ['L', -0.4, 0.32], ['Z']], fill: false, stroke: 0.09 },
  diamonds: { cmds: [['M', 0, -0.5], ['L', 0.35, 0], ['L', 0, 0.5], ['L', -0.35, 0], ['Z']], fill: true, stroke: 0 },
  chevrons: { cmds: [['M', -0.2, -0.4], ['L', 0.2, 0], ['L', -0.2, 0.4]], fill: false, stroke: 0.12 },
};

/** Generatore pseudo-casuale deterministico: l'anteprima non "salta" a ogni render. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (n: number) => Math.round(n * 100) / 100;
const MAX_TILES = 1400;

function rotationFor(kind: PatternKind, rand: () => number): number {
  switch (kind) {
    case 'dashes': return -35;
    case 'leaves': return rand() * 360;
    case 'triangles': return (rand() - 0.5) * 50;
    case 'stars': return (rand() - 0.5) * 24;
    case 'sparkles': return (rand() - 0.5) * 16;
    default: return 0;
  }
}

/** Forme (coordinate relative alla regione) con opacità già decrescente verso la dissolvenza. */
export function generatePattern(s: PatternSettings, region: Region): PatternShape[] {
  if (s.kind === 'none' || region.width <= 0 || region.height <= 0) return [];
  const size = Math.max(2, s.size);
  let step = Math.max(size * 0.8, size * s.spacing);
  // Limite al numero di elementi: evita PDF enormi con elementi minuscoli su regioni grandi.
  while ((region.width / step + 1) * (region.height / step + 1) > MAX_TILES) step *= 1.15;

  const rand = rng(1234);
  const shapes: PatternShape[] = [];
  const { anchor } = s;
  const originX = anchor === 'top-right' || anchor === 'bottom-right' ? region.width : 0;
  const originY = anchor === 'bottom-left' || anchor === 'bottom-right' || anchor === 'bottom' ? region.height : 0;

  for (let row = 0, y = 0; y <= region.height + step / 2; row++, y += step) {
    for (let x = row % 2 ? step / 2 : 0; x <= region.width + step / 2; x += step) {
      const u = anchor === 'top' || anchor === 'bottom' || anchor === 'full' ? 0 : Math.abs(x - originX) / region.width;
      const v = anchor === 'full' ? 0 : Math.abs(y - originY) / region.height;
      const t = Math.min(1, anchor === 'top' || anchor === 'bottom' ? v : anchor === 'full' ? 0 : (u + v) / 2);
      const opacity = s.visibility * (1 - s.fade * t);
      const rot = rotationFor(s.kind, rand); // consumato sempre: la sequenza non dipende dalla visibilità
      if (opacity < 0.02 || x > region.width + size / 2) continue;

      if (s.kind === 'dots') { shapes.push({ type: 'circle', cx: fmt(x), cy: fmt(y), r: fmt(size * 0.18), fill: true, strokeWidth: 0, opacity: fmt(opacity * 100) / 100 }); continue; }
      if (s.kind === 'rings') { shapes.push({ type: 'circle', cx: fmt(x), cy: fmt(y), r: fmt(size * 0.3), fill: false, strokeWidth: fmt(size * 0.08), opacity: fmt(opacity * 100) / 100 }); continue; }

      const def = SHAPES[s.kind];
      const a = (rot * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
      const pt = (px: number, py: number) => `${fmt(x + (px * cos - py * sin) * size)} ${fmt(y + (px * sin + py * cos) * size)}`;
      const d = def.cmds.map((c) => {
        if (c[0] === 'Z') return 'Z';
        if (c[0] === 'Q') return `Q${pt(c[1], c[2])} ${pt(c[3], c[4])}`;
        return `${c[0]}${pt(c[1], c[2])}`;
      }).join(' ');
      shapes.push({ type: 'path', d, fill: def.fill, strokeWidth: fmt(def.stroke * size), opacity: fmt(opacity * 100) / 100 });
    }
  }
  return shapes;
}

/**
 * Colore effettivo: quello scelto; altrimenti l'accento della palette, o il colore secondario se
 * l'accento si distingue troppo poco dallo sfondo (es. lime su bianco).
 */
export function resolvePatternColor(s: PatternSettings, colors: { accent: string; secondary: string; background: string }, contrast: (a: string, b: string) => number): string {
  if (s.color) return s.color;
  return contrast(colors.accent, colors.background) >= 1.8 ? colors.accent : colors.secondary;
}
