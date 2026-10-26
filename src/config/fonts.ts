import manifest from './fonts-manifest.json';

export type FontCategory = 'sans' | 'serif' | 'modern' | 'classic' | 'tech' | 'elegant';
export interface FontFile { weight: number; style: 'normal' | 'italic'; file: string }
export interface FontDef { id: string; label: string; category: FontCategory; files: FontFile[] }

export const fonts = manifest as FontDef[];
export const fontCategories: FontCategory[] = ['sans', 'serif', 'modern', 'classic', 'tech', 'elegant'];
export const getFont = (id: string) => fonts.find((f) => f.id === id) ?? fonts[0]!;

/** Pesi realmente disponibili (stile normal) per una famiglia. */
export const availableWeights = (id: string) => [...new Set(getFont(id).files.filter((f) => f.style === 'normal').map((f) => f.weight))];

const WEIGHTS = [300, 400, 500, 600, 700] as const;
const nearest = (files: FontFile[], weight: number) =>
  files.reduce((best, f) => (Math.abs(f.weight - weight) < Math.abs(best.weight - weight) ? f : best));

/**
 * Descrittori per react-pdf: copre ogni peso 300-700 x normal/italic mappando sul file più vicino,
 * così nessuna combinazione fa fallire il rendering (le famiglie senza italic ricadono sul normale).
 */
export function pdfFontSources(font: FontDef, baseUrl: string) {
  const normal = font.files.filter((f) => f.style === 'normal');
  const italic = font.files.filter((f) => f.style === 'italic');
  const out: Array<{ src: string; fontWeight: number; fontStyle: 'normal' | 'italic' }> = [];
  for (const weight of WEIGHTS) {
    out.push({ src: `${baseUrl}/fonts/${font.id}/${nearest(normal, weight).file}`, fontWeight: weight, fontStyle: 'normal' });
    const pool = italic.length ? italic : normal;
    out.push({ src: `${baseUrl}/fonts/${font.id}/${nearest(pool, weight).file}`, fontWeight: weight, fontStyle: 'italic' });
  }
  return out;
}
