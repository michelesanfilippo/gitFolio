import type { RichText } from '../richtext/ast';

// Sottoinsieme del modello definito nel piano; verrà esteso (e validato con Zod) in Fase 1.
export type Id = string;
export interface Link { id: Id; label?: string; url: string }
export interface DateRange { start?: string; end?: string; current?: boolean } // "YYYY-MM"

export interface Personal {
  fullName: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  links: Link[];
}
export interface ExperienceItem { id: Id; role: string; company?: string; location?: string; dates: DateRange; description?: RichText }
export interface EducationItem { id: Id; degree: string; school?: string; location?: string; dates: DateRange; description?: RichText }
export interface SkillGroup { id: Id; name?: string; skills: Array<{ name: string; level?: number }> } // level 1..5
export interface LanguageItem { id: Id; name: string; level: string; value?: number } // value 1..5
export interface CertItem { id: Id; name: string; issuer?: string; date?: string; url?: string }
export interface ProjectItem { id: Id; name: string; role?: string; description?: RichText; tech?: string[]; url?: string }

export type Locale = 'en' | 'it' | 'fr' | 'de' | 'es';

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
}
