import type { RichText } from '../richtext/ast';

// Modello dei contenuti del CV. Indipendente dal design: cambiare template/palette non tocca questi dati.
export type Id = string;
export type Locale = 'en' | 'it' | 'fr' | 'de' | 'es';

export type ContactKind = 'email' | 'phone' | 'location' | 'website' | 'linkedin' | 'github' | 'link';
export interface ContactItem {
  id: Id;
  kind: ContactKind;
  /** Testo mostrato / indirizzo (email, telefono, città, URL). */
  value: string;
  visible: boolean;
}

export interface DateRange { start?: string; end?: string; current?: boolean } // "YYYY-MM"

export interface Personal {
  fullName: string;
  headline?: string;
  /** Data URL JPEG già ritagliata/ridimensionata (elaborata nel browser, mai inviata altrove). */
  photo?: string;
  contacts: ContactItem[];
}

export interface ExperienceItem { id: Id; role: string; company?: string; location?: string; dates: DateRange; description?: RichText }
export interface EducationItem { id: Id; degree: string; school?: string; location?: string; dates: DateRange; description?: RichText }
export interface Skill { id: Id; name: string; level?: number } // level 1..5
export interface SkillGroup { id: Id; name?: string; skills: Skill[] }
export interface LanguageItem { id: Id; name: string; level: string; value?: number } // value 1..5
export interface CertItem { id: Id; name: string; issuer?: string; date?: string; url?: string }
export interface ProjectItem { id: Id; name: string; role?: string; description?: RichText; tech?: string[]; url?: string }
export interface CustomSection { id: Id; title: string; body: RichText }

export interface CvDocument {
  locale: Locale;
  personal: Personal;
  profile?: RichText;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  languages: LanguageItem[];
  certifications: CertItem[];
  projects: ProjectItem[];
  /** Sezioni create dall'utente (id con prefisso `custom-`). */
  custom: CustomSection[];
  /** Titoli personalizzati delle sezioni, per id di sezione. Assente = titolo predefinito della lingua. */
  sectionTitles: Record<string, string>;
  /** Id delle sezioni nascoste (non compaiono nel PDF). */
  hiddenSections: string[];
}

export const CUSTOM_PREFIX = 'custom-';
export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX);

export const newId = (): Id =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);
