import type { Block, Inline, RichText } from '../richtext/ast';
import { normalizeUrl } from '../richtext/sanitize';
import type { Locale } from '../schema/cv';
import type { DesignSettings } from '../schema/design';

/** Cosa viene salvato per ogni CV dell'utente (colonna `data` jsonb). `v` permette migrazioni future. */
export interface SavedCvData {
  v: 1;
  locale: Locale;
  profile?: RichText;
  design: DesignSettings;
  /** Data URL (jpeg/png/webp) già ritagliata dall'editor. */
  photo?: string;
}

export const MAX_TEMPLATES = 5;
const LOCALES: Locale[] = ['en', 'it', 'fr', 'de', 'es'];
export const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_CHARS = 200_000;

export const isPhotoDataUrl = (v: unknown): v is string => typeof v === 'string' && v.length < MAX_PHOTO_CHARS && PHOTO_DATA_URL.test(v);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Fonde `incoming` sopra `base` tenendo SOLO le chiavi note e con lo stesso tipo: documenti vecchi (senza
 * campi nuovi) o manomessi non rompono mai il rendering.
 */
export function mergeKnown<T>(base: T, incoming: unknown): T {
  if (Array.isArray(base)) return (Array.isArray(incoming) && incoming.every((x) => typeof x === typeof base[0] || base.length === 0) ? incoming : base) as T;
  if (!isObj(base)) return (typeof incoming === typeof base && incoming !== null ? incoming : base) as T;
  // Mappa dinamica vuota per default (es. sidebarOffsets): si accettano solo valori numerici finiti.
  if (Object.keys(base).length === 0) {
    return (isObj(incoming) ? Object.fromEntries(Object.entries(incoming).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) : base) as T;
  }
  const src = isObj(incoming) ? incoming : {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(base)) out[k] = k in src ? mergeKnown(v, src[k]) : v;
  return out as T;
}

function cleanInlines(raw: unknown): Inline[] {
  if (!Array.isArray(raw)) return [];
  const out: Inline[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.text !== 'string') continue;
    const i: Inline = { text: r.text.slice(0, 5000) };
    if (r.bold === true) i.bold = true;
    if (r.italic === true) i.italic = true;
    if (r.underline === true) i.underline = true;
    if (typeof r.link === 'string') { const u = normalizeUrl(r.link); if (u) i.link = u; }
    out.push(i);
  }
  return out;
}

export function cleanRichText(raw: unknown): RichText | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blocks: Block[] = [];
  for (const b of raw.slice(0, 200)) {
    if (!isObj(b)) continue;
    if (b.type === 'p') blocks.push({ type: 'p', content: cleanInlines(b.content) });
    else if ((b.type === 'ul' || b.type === 'ol') && Array.isArray(b.items)) blocks.push({ type: b.type, items: b.items.slice(0, 200).map(cleanInlines) });
  }
  return blocks;
}

/** Valida e completa un documento letto dal database. Restituisce null se irrecuperabile. */
export function normalizeSaved(raw: unknown, baseDesign: DesignSettings): Omit<SavedCvData, 'v'> | null {
  if (!isObj(raw)) return null;
  return {
    locale: LOCALES.includes(raw.locale as Locale) ? (raw.locale as Locale) : 'en',
    profile: raw.profile === undefined ? undefined : cleanRichText(raw.profile),
    design: mergeKnown(baseDesign, raw.design),
    photo: isPhotoDataUrl(raw.photo) ? raw.photo : undefined,
  };
}
