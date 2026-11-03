import { normalizeUrl } from '../richtext/url';
import type { ContactItem, Locale } from '../schema/cv';

/** "YYYY-MM-DD" di un giorno che esiste davvero, non nel futuro e dal 1900 in poi. */
export function isValidIsoDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d && y >= 1900 && t.getTime() <= Date.now();
}

/** "1990-03-12" → "12 March 1990" (formato esteso nella lingua del CV). Se non è una data valida restituisce il testo com'è. */
export function formatBirthDate(v: string, locale: Locale = 'en'): string {
  if (!isValidIsoDate(v)) return v;
  const [y, m, d] = v.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Indirizzo cliccabile del contatto, o undefined se non applicabile/valido. */
export function contactHref(c: ContactItem): string | undefined {
  const v = c.value.trim();
  if (!v) return undefined;
  switch (c.kind) {
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : undefined;
    case 'phone': { const digits = v.replace(/[^\d+]/g, ''); return digits.length >= 5 ? `tel:${digits}` : undefined; }
    case 'location': case 'birthdate': return undefined;
    default: return normalizeUrl(v) ?? undefined;
  }
}

/** Testo mostrato: gli URL senza protocollo, "www." e "/" finale; la data di nascita per esteso nella lingua del CV. */
export function contactText(c: ContactItem, locale: Locale = 'en'): string {
  const v = c.value.trim();
  if (c.kind === 'birthdate') return formatBirthDate(v, locale);
  if (c.kind === 'email' || c.kind === 'phone' || c.kind === 'location') return v;
  return v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

/** Contatti da mostrare: visibili e con un valore. */
export const visibleContacts = (contacts: ContactItem[]) => contacts.filter((c) => c.visible && c.value.trim());

/** Perché un valore non diventerà un link cliccabile nel PDF (testo da mostrare accanto al campo), o undefined se va bene. */
export function contactWarning(c: ContactItem): string | undefined {
  if (!c.value.trim() || c.kind === 'location' || c.kind === 'birthdate' || contactHref(c)) return undefined;
  if (c.kind === 'email') return "This doesn't look like an email address, so it won't be a clickable link.";
  if (c.kind === 'phone') return 'Add at least 5 digits to make this a clickable phone link.';
  return "This doesn't look like a web address, so it won't be a clickable link.";
}
