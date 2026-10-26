import { newId } from '../schema/cv';

// Operazioni pure sulle liste di voci (esperienze, competenze, contatti...). Restituiscono sempre nuovi array.

export function move<T>(list: readonly T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (index < 0 || index >= list.length || j < 0 || j >= list.length) return [...list];
  const next = [...list];
  [next[index], next[j]] = [next[j]!, next[index]!];
  return next;
}

export const removeAt = <T>(list: readonly T[], index: number): T[] => list.filter((_, i) => i !== index);

export const update = <T extends { id: string }>(list: readonly T[], id: string, patch: Partial<T>): T[] =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x));

/** Duplica la voce subito dopo l'originale, con id nuovi (anche per le sotto-voci con `id`). */
export function duplicateAt<T extends { id: string }>(list: readonly T[], index: number): T[] {
  const src = list[index];
  if (!src) return [...list];
  const copy = reId(src);
  return [...list.slice(0, index + 1), copy, ...list.slice(index + 1)];
}

function reId<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reId) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === 'id' && typeof v === 'string' ? newId() : reId(v)])) as T;
  }
  return value;
}
