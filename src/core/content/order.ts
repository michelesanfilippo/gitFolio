import { CUSTOM_PREFIX, newId, type CvDocument, type CustomSection } from '../schema/cv';

/** Sezioni standard, nell'ordine di partenza. `contacts` è la lista dei contatti (nell'intestazione o nella colonna laterale). */
export const STANDARD_SECTIONS = ['contacts', 'profile', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications'] as const;
export type StandardSection = (typeof STANDARD_SECTIONS)[number];
export const isStandard = (id: string): id is StandardSection => (STANDARD_SECTIONS as readonly string[]).includes(id);

export const DEFAULT_SIDE: string[] = ['contacts', 'skills', 'languages', 'certifications'];

export const allSectionIds = (doc: Pick<CvDocument, 'custom'>): string[] => [...STANDARD_SECTIONS, ...doc.custom.map((c) => c.id)];

/** Ordine effettivo: ids noti nell'ordine salvato (senza doppioni), poi quelli mancanti (nuove sezioni) in coda. */
export function effectiveOrder(order: string[], doc: Pick<CvDocument, 'custom'>): string[] {
  const known = new Set(allSectionIds(doc));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of order) if (known.has(id) && !seen.has(id)) { seen.add(id); out.push(id); }
  for (const id of allSectionIds(doc)) if (!seen.has(id)) out.push(id);
  return out;
}

export interface TitleLabels { profile: string; experience: string; education: string; skills: string; languages: string; certifications: string; projects: string; contacts: string }

/** Titolo mostrato: personalizzato dall'utente > titolo della sezione personalizzata > etichetta della lingua. */
export function sectionTitle(id: string, doc: Pick<CvDocument, 'custom' | 'sectionTitles'>, labels: TitleLabels): string {
  const own = doc.sectionTitles[id]?.trim();
  if (own) return own;
  if (isStandard(id)) return labels[id];
  return doc.custom.find((c) => c.id === id)?.title || 'Untitled section';
}

/** Sposta `id` di una posizione tra le sezioni della sua stessa colonna (le altre colonne non cambiano). */
export function moveWithinColumn(order: string[], side: ReadonlySet<string>, id: string, dir: -1 | 1): string[] {
  const inSide = side.has(id);
  const column = order.filter((x) => side.has(x) === inSide);
  const i = column.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= column.length) return order;
  const other = column[j]!;
  const next = [...order];
  const a = next.indexOf(id), b = next.indexOf(other);
  next[a] = other; next[b] = id;
  return next;
}

/** Inserisce `id` prima/dopo `anchor` (se null o assente: in fondo). */
export function insertRelative(order: string[], id: string, anchor: string | null, where: 'before' | 'after'): string[] {
  const rest = order.filter((x) => x !== id);
  const at = anchor ? rest.indexOf(anchor) : -1;
  if (at < 0) return [...rest, id];
  rest.splice(where === 'before' ? at : at + 1, 0, id);
  return rest;
}

export function newCustomSection(title: string, body: CustomSection['body']): CustomSection {
  return { id: `${CUSTOM_PREFIX}${newId()}`, title, body };
}
