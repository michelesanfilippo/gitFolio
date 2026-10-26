import type { Locale } from '@/core/schema/cv';

// Etichette di sezione stampate nel PDF, nella lingua del contenuto del CV.
export interface Labels {
  profile: string; experience: string; education: string; skills: string; languages: string;
  certifications: string; projects: string; contacts: string; present: string; verify: string;
}

export const labels: Record<Locale, Labels> = {
  en: { profile: 'Profile', experience: 'Experience', education: 'Education', skills: 'Skills', languages: 'Languages', certifications: 'Certifications', projects: 'Projects', contacts: 'Contacts', present: 'Present', verify: 'Verify' },
  it: { profile: 'Profilo', experience: 'Esperienza', education: 'Formazione', skills: 'Competenze', languages: 'Lingue', certifications: 'Certificazioni', projects: 'Progetti', contacts: 'Contatti', present: 'Presente', verify: 'Verifica' },
  fr: { profile: 'Profil', experience: 'Expérience', education: 'Formation', skills: 'Compétences', languages: 'Langues', certifications: 'Certifications', projects: 'Projets', contacts: 'Contact', present: 'Présent', verify: 'Vérifier' },
  de: { profile: 'Profil', experience: 'Berufserfahrung', education: 'Ausbildung', skills: 'Kenntnisse', languages: 'Sprachen', certifications: 'Zertifikate', projects: 'Projekte', contacts: 'Kontakt', present: 'Heute', verify: 'Prüfen' },
  es: { profile: 'Perfil', experience: 'Experiencia', education: 'Formación', skills: 'Competencias', languages: 'Idiomas', certifications: 'Certificaciones', projects: 'Proyectos', contacts: 'Contacto', present: 'Actualidad', verify: 'Verificar' },
};

/** "2021-03" -> "03/2021" (formattazione locale per mese+anno). */
export function formatMonth(value: string | undefined, locale: Locale): string {
  if (!value) return '';
  const [y, m] = value.split('-');
  if (!m) return y ?? '';
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(d);
}
