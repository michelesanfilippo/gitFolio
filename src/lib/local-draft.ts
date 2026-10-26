import { normalizeSaved, type SavedCvData } from '@/core/saved/saved-cv';
import type { CvDocument } from '@/core/schema/cv';
import type { DesignSettings } from '@/core/schema/design';

// Salvataggio automatico locale: la bozza resta SOLO in questo browser (localStorage), nulla viene inviato.
// Due slot alternati: un salvataggio non sovrascrive mai l'ultima copia valida con dati rovinati, e se uno slot
// si corrompe l'altro resta leggibile.
const SLOTS = ['gitfolio:draft:a', 'gitfolio:draft:b'] as const;
const MAX_CHARS = 2_000_000;

interface Slot { savedAt: number; data: unknown }

function read(key: string): Slot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Slot;
    return typeof v?.savedAt === 'number' && v.data !== undefined ? v : null;
  } catch {
    return null; // JSON rovinato o storage non disponibile
  }
}

export interface LoadedDraft { content: CvDocument; design: DesignSettings; savedAt: number }

/** Ultima bozza valida (la più recente tra i due slot), già validata e completata. */
export function loadDraft(baseDesign: DesignSettings): LoadedDraft | null {
  let best: LoadedDraft | null = null;
  for (const key of SLOTS) {
    const slot = read(key);
    if (!slot) continue;
    const n = normalizeSaved(slot.data, baseDesign);
    if (n && (!best || slot.savedAt > best.savedAt)) best = { ...n, savedAt: slot.savedAt };
  }
  return best;
}

/** Scrive nello slot più vecchio (o vuoto/rovinato). Restituisce false se non è stato possibile (quota piena, storage bloccato). */
export function saveDraft(data: SavedCvData): boolean {
  try {
    const json = JSON.stringify({ savedAt: Date.now(), data });
    if (json.length > MAX_CHARS) return false;
    const [a, b] = SLOTS.map((k) => ({ k, s: read(k) }));
    const target = !a!.s ? a! : !b!.s ? b! : a!.s.savedAt <= b!.s.savedAt ? a! : b!;
    localStorage.setItem(target.k, json);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  try { for (const k of SLOTS) localStorage.removeItem(k); } catch { /* storage non disponibile */ }
}
