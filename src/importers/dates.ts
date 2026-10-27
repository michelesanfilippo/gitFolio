import type { DateRange } from '@/core/schema/cv';

// Date scritte come capita nei CV (en, it, fr, de, es) → "YYYY-MM".

// Prefissi dei mesi: il più lungo che combacia vince.
const MONTH_PREFIX: Array<[string, number]> = ([
  ['jan', 1], ['gen', 1], ['ene', 1], ['janv', 1], ['feb', 2], ['fév', 2], ['fev', 2], ['mar', 3], ['mär', 3], ['apr', 4], ['abr', 4], ['avr', 4],
  ['may', 5], ['mag', 5], ['mai', 5], ['jun', 6], ['giu', 6], ['juin', 6], ['jul', 7], ['lug', 7], ['juil', 7], ['aug', 8], ['ago', 8], ['aoû', 8], ['aou', 8],
  ['sep', 9], ['set', 9], ['oct', 10], ['ott', 10], ['okt', 10], ['nov', 11], ['dec', 12], ['dic', 12], ['dez', 12], ['déc', 12],
] as Array<[string, number]>).sort((a, b) => b[0].length - a[0].length);
const monthOf = (word: string) => MONTH_PREFIX.find(([p]) => word.startsWith(p))?.[1];

export const PRESENT_RE = /^(present|current|now|today|ongoing|presente|attuale|oggi|in corso|aujourd[’']hui|actuel|heute|aktuell|actualidad|actualmente|hoy)$/i;

const pad = (n: number | string) => String(n).padStart(2, '0');

/** "Jan 2020" / "January 2020" / "2020-01" / "01/2020" / "01.2020" / "2020" → "YYYY-MM" (solo anno: mese `fallback`). */
export function parseMonth(v: string | undefined, fallback: '01' | '12' = '01'): string | undefined {
  const s = (v ?? '').trim().toLowerCase().replace(/[.,]+$/, '');
  if (!s) return undefined;
  let m = /^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/.exec(s);
  if (m) return `${m[1]}-${pad(m[2]!)}`;
  m = /^(?:\d{1,2}[/.])?(\d{1,2})[/.](\d{4})$/.exec(s);
  if (m) return `${m[2]}-${pad(m[1]!)}`;
  m = /(\p{L}{3,})\.?\s+(?:\d{1,2}(?:st|nd|rd|th)?,?\s+)?(\d{4})/u.exec(s);
  const mi = m ? monthOf(m[1]!) : undefined;
  if (m && mi) return `${m[2]}-${pad(mi)}`;
  m = /^(\d{1,2})\s+(\p{L}{3,})\.?\s+(\d{4})$/u.exec(s); // "5 marzo 2020"
  const mi2 = m ? monthOf(m[2]!) : undefined;
  if (m && mi2) return `${m[3]}-${pad(mi2)}`;
  m = /^(?:'|’)?(\d{4})$/.exec(s);
  if (m) return `${m[1]}-${fallback}`;
  return undefined;
}

// solo nomi di mese veri (una parola qualsiasi davanti a un anno, come "Budget 2020", non è una data con il mese)
const MONTH_NAME = `(?:${MONTH_PREFIX.map(([p]) => p).join('|')})\\p{L}*\\.?`;
const MONTH_WORD = `(?:${MONTH_NAME}\\s+(?:\\d{1,2}(?:st|nd|rd|th)?,?\\s+)?|\\d{1,2}\\s+${MONTH_NAME}\\s+)?`;
const ONE = `(?:${MONTH_WORD}\\d{4}|\\d{4}[-/.]\\d{1,2}|\\d{1,2}[/.]\\d{4})`;
const PRESENT = "(?:present|current|now|today|ongoing|presente|attuale|oggi|in corso|aujourd[’']hui|actuel|heute|aktuell|actualidad|actualmente|hoy)";
/** Intervallo di date dentro una riga: "Jan 2020 – Present", "2019 - 2021", "03/2020 to 05/2022", "dal 2019 al 2021". */
export const RANGE_RE = new RegExp(`(?:\\b(?:from|dal|da|de|von|desde)\\s+)?(${ONE})\\s*(?:[-–—→]+|to|al|a|au|à|bis|hasta|a\\.)\\s*(${ONE}|${PRESENT})\\b`, 'iu');
/** Solo un periodo (una data singola o un anno) alla fine della riga: "Master's degree, 2017". */
export const SINGLE_DATE_END_RE = new RegExp(`(?:^|[\\s,(|–—-])(${ONE})\\)?\\s*$`, 'iu');

export interface FoundRange { range: DateRange; rest: string }

/** Trova un intervallo di date nella riga e restituisce il resto del testo senza di esso. */
export function findRange(line: string): FoundRange | undefined {
  const m = RANGE_RE.exec(line);
  if (!m) return undefined;
  const start = parseMonth(m[1], '01');
  const endRaw = m[2]!;
  const current = new RegExp(`^${PRESENT}$`, 'i').test(endRaw);
  const end = current ? undefined : parseMonth(endRaw, '12');
  if (!start && !end && !current) return undefined;
  const range: DateRange = {};
  if (start) range.start = start;
  if (end) range.end = end;
  if (current) range.current = true;
  const rest = (line.slice(0, m.index) + ' ' + line.slice(m.index + m[0].length)).replace(/\s*[|·•,;()–—-]+\s*$/u, '').replace(/^\s*[|·•,;()–—-]+\s*/u, '').replace(/\s{2,}/g, ' ').trim();
  return { range, rest };
}

/** Data singola alla fine della riga (certificazioni, titoli di studio). */
export function findSingleDate(line: string): { month: string; rest: string } | undefined {
  const m = SINGLE_DATE_END_RE.exec(line);
  if (!m) return undefined;
  const month = parseMonth(m[1], '01');
  if (!month) return undefined;
  const rest = line.slice(0, m.index).replace(/\s*[|·•,;(–—-]+\s*$/u, '').trim();
  return { month, rest };
}
