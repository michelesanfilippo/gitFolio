import { newId, type CvDocument } from '@/core/schema/cv';

// Dati che LinkedIn espone alle app di terze parti con il login (OpenID Connect): nome, email, foto. Nient'altro.
export interface LinkedInData { name?: string; email?: string; photo?: string }

/** Aggiorna nome, email (contatto esistente o nuovo) e foto; il resto del CV non cambia. */
export function applyLinkedIn(doc: CvDocument, d: LinkedInData): CvDocument {
  let contacts = doc.personal.contacts;
  if (d.email) {
    contacts = contacts.some((c) => c.kind === 'email')
      ? contacts.map((c) => (c.kind === 'email' ? { ...c, value: d.email! } : c))
      : [{ id: newId(), kind: 'email', value: d.email, visible: true }, ...contacts];
  }
  return {
    ...doc,
    personal: { ...doc.personal, fullName: d.name ?? doc.personal.fullName, photo: d.photo ?? doc.personal.photo, contacts },
  };
}
