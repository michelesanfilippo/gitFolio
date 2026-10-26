import { normalizeUrl } from '../richtext/url';
import type { ContactItem } from '../schema/cv';

/** Indirizzo cliccabile del contatto, o undefined se non applicabile/valido. */
export function contactHref(c: ContactItem): string | undefined {
  const v = c.value.trim();
  if (!v) return undefined;
  switch (c.kind) {
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : undefined;
    case 'phone': { const digits = v.replace(/[^\d+]/g, ''); return digits.length >= 5 ? `tel:${digits}` : undefined; }
    case 'location': return undefined;
    default: return normalizeUrl(v) ?? undefined;
  }
}

/** Testo mostrato: gli URL senza protocollo, "www." e "/" finale. */
export function contactText(c: ContactItem): string {
  const v = c.value.trim();
  if (c.kind === 'email' || c.kind === 'phone' || c.kind === 'location') return v;
  return v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

/** Contatti da mostrare: visibili e con un valore. */
export const visibleContacts = (contacts: ContactItem[]) => contacts.filter((c) => c.visible && c.value.trim());
