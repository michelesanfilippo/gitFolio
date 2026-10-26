import { CONTACT_KINDS } from '../icons/contact-icons';
import type { Block, Inline, RichText } from '../richtext/ast';
import { normalizeUrl } from '../richtext/url';
import { CUSTOM_PREFIX, newId, type ContactItem, type CvDocument, type DateRange, type Locale } from '../schema/cv';
import type { DesignSettings } from '../schema/design';
import { sampleCv } from '../schema/sample';

/** Cosa viene salvato per ogni CV dell'utente (colonna `data` jsonb). `v` permette migrazioni future. */
export interface SavedCvData {
  v: 2;
  /** Contenuti (testi, voci, contatti, sezioni personalizzate, foto). */
  content: CvDocument;
  design: DesignSettings;
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

/* ------------------------------ rich text ------------------------------ */

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

/* ------------------------------- contenuti ------------------------------ */

const str = (v: unknown, max = 300): string => (typeof v === 'string' ? v.slice(0, max) : '');
const optStr = (v: unknown, max = 300): string | undefined => { const s = str(v, max); return s ? s : undefined; };
const list = (v: unknown, max = 50): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const month = (v: unknown) => (typeof v === 'string' && MONTH.test(v) ? v : undefined);

/** Garantisce id stringa univoci nella lista (le chiavi React non devono collidere). */
function ids<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((it) => {
    const id = it.id && !seen.has(it.id) ? it.id : newId();
    seen.add(id);
    return id === it.id ? it : { ...it, id };
  });
}
const rid = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 60 ? v : newId());

function dates(v: unknown): DateRange {
  const o = isObj(v) ? v : {};
  const r: DateRange = {};
  const s = month(o.start), e = month(o.end);
  if (s) r.start = s;
  if (e) r.end = e;
  if (o.current === true) r.current = true;
  return r;
}

const level = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5 ? Math.round(v) : undefined);

/** Valida e completa i contenuti letti dal database. I campi mancanti prendono il valore di `fallback`. */
export function cleanContent(raw: unknown, fallback: CvDocument): CvDocument {
  const o = isObj(raw) ? raw : {};
  const per = isObj(o.personal) ? o.personal : {};

  const contacts: ContactItem[] = ids(
    list(per.contacts, 30).filter(isObj).map((c) => ({
      id: rid(c.id),
      kind: (CONTACT_KINDS as string[]).includes(c.kind as string) ? (c.kind as ContactItem['kind']) : 'link',
      value: str(c.value, 200),
      visible: c.visible !== false,
    })),
  );

  const custom = ids(
    list(o.custom, 20).filter(isObj).map((c) => {
      const id = typeof c.id === 'string' && c.id.startsWith(CUSTOM_PREFIX) && c.id.length <= 60 ? c.id : `${CUSTOM_PREFIX}${newId()}`;
      return { id, title: str(c.title, 80), body: cleanRichText(c.body) ?? [] };
    }),
  );
  const customIds = new Set(custom.map((c) => c.id));

  const titles: Record<string, string> = {};
  if (isObj(o.sectionTitles)) {
    for (const [k, v] of Object.entries(o.sectionTitles).slice(0, 40)) if (typeof v === 'string' && v.trim()) titles[k.slice(0, 60)] = v.slice(0, 80);
  }

  const has = (k: string) => k in o;
  return {
    locale: LOCALES.includes(o.locale as Locale) ? (o.locale as Locale) : fallback.locale,
    personal: {
      fullName: has('personal') ? str(per.fullName, 100) : fallback.personal.fullName,
      headline: has('personal') ? optStr(per.headline, 120) : fallback.personal.headline,
      photo: isPhotoDataUrl(per.photo) ? per.photo : undefined,
      contacts: Array.isArray(per.contacts) ? contacts : fallback.personal.contacts,
    },
    profile: has('profile') ? cleanRichText(o.profile) : fallback.profile,
    experience: has('experience') ? ids(list(o.experience).filter(isObj).map((e) => ({
      id: rid(e.id), role: str(e.role, 120), company: optStr(e.company, 120), location: optStr(e.location, 120), dates: dates(e.dates), description: cleanRichText(e.description),
    }))) : fallback.experience,
    education: has('education') ? ids(list(o.education).filter(isObj).map((e) => ({
      id: rid(e.id), degree: str(e.degree, 120), school: optStr(e.school, 120), location: optStr(e.location, 120), dates: dates(e.dates), description: cleanRichText(e.description),
    }))) : fallback.education,
    skills: has('skills') ? ids(list(o.skills, 20).filter(isObj).map((g) => ({
      id: rid(g.id), name: optStr(g.name, 80),
      skills: ids(list(g.skills, 60).filter(isObj).map((s) => ({ id: rid(s.id), name: str(s.name, 80), level: level(s.level) }))),
    }))) : fallback.skills,
    languages: has('languages') ? ids(list(o.languages, 20).filter(isObj).map((l) => ({
      id: rid(l.id), name: str(l.name, 60), level: str(l.level, 40), value: level(l.value),
    }))) : fallback.languages,
    certifications: has('certifications') ? ids(list(o.certifications).filter(isObj).map((c) => ({
      id: rid(c.id), name: str(c.name, 150), issuer: optStr(c.issuer, 120), date: month(c.date), url: optStr(c.url, 300),
    }))) : fallback.certifications,
    projects: has('projects') ? ids(list(o.projects).filter(isObj).map((p) => ({
      id: rid(p.id), name: str(p.name, 120), role: optStr(p.role, 120), url: optStr(p.url, 300), description: cleanRichText(p.description),
      tech: list(p.tech, 30).filter((t): t is string => typeof t === 'string').map((t) => t.slice(0, 40)),
    }))) : fallback.projects,
    custom,
    sectionTitles: Object.fromEntries(Object.entries(titles).filter(([k]) => !k.startsWith(CUSTOM_PREFIX) || customIds.has(k))),
    hiddenSections: list(o.hiddenSections, 40).filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 60)),
  };
}

/** Valida e completa un documento letto dal database. Accetta anche il formato v1 (solo design + profilo + foto). */
export function normalizeSaved(raw: unknown, baseDesign: DesignSettings): { content: CvDocument; design: DesignSettings } | null {
  if (!isObj(raw)) return null;
  const sample = sampleCv();
  if (raw.v === 2) {
    return { content: cleanContent(raw.content, sample), design: mergeKnown(baseDesign, raw.design) };
  }
  // v1: { locale, profile, design, photo }
  const content = cleanContent({ locale: raw.locale, profile: raw.profile }, sample);
  content.personal.photo = isPhotoDataUrl(raw.photo) ? raw.photo : undefined;
  return { content, design: mergeKnown(baseDesign, raw.design) };
}
