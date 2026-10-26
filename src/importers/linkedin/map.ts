import type { Block, RichText } from '@/core/richtext/ast';
import {
  newId, type CertItem, type ContactItem, type ContactKind, type CvDocument, type DateRange, type EducationItem,
  type ExperienceItem, type LanguageItem, type ProjectItem, type Skill,
} from '@/core/schema/cv';
import { sampleCv } from '@/core/schema/sample';
import { csvRecords } from './csv';

// Export dati di LinkedIn ("Settings → Data privacy → Get a copy of your data") → contenuti del CV.
// Tutto avviene nel browser; l'utente rivede le sezioni prima di applicarle.

/** File dell'export che servono (nome in minuscolo, senza cartelle). */
export const LINKEDIN_FILES = ['profile.csv', 'positions.csv', 'education.csv', 'certifications.csv', 'skills.csv', 'languages.csv',
  'projects.csv', 'email addresses.csv', 'phonenumbers.csv', 'phone numbers.csv'] as const;
export const isLinkedInFile = (name: string) => (LINKEDIN_FILES as readonly string[]).includes(name.toLowerCase());

export interface LinkedInImport {
  fullName?: string;
  headline?: string;
  location?: string;
  email?: string;
  phone?: string;
  websites: string[];
  profile?: RichText;
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertItem[];
  skills: Skill[];
  languages: LanguageItem[];
  projects: ProjectItem[];
  /** True se qualche data aveva solo l'anno (il mese è stato stimato): l'utente va avvisato. */
  approxDates: boolean;
}

export type ImportSection = 'personal' | 'profile' | 'experience' | 'education' | 'certifications' | 'skills' | 'languages' | 'projects';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "Jan 2020" / "January 2020" / "Jan 5, 2020" / "2020-01" / "01/2020" / "2020" → "YYYY-MM". Solo anno: mese `fallback`. */
export function linkedInMonth(v: string | undefined, fallback: '01' | '12', flag?: { approx: boolean }): string | undefined {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return undefined;
  let m = /^(\d{4})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2]!.padStart(2, '0')}`;
  m = /^(\d{1,2})\/(?:\d{1,2}\/)?(\d{4})$/.exec(s);
  if (m) return `${m[2]}-${m[1]!.padStart(2, '0')}`;
  m = /([a-z]{3})[a-z]*\.?\s+(?:\d{1,2},?\s+)?(\d{4})/.exec(s);
  const mi = m ? MONTHS.indexOf(m[1]!) : -1;
  if (m && mi >= 0) return `${m[2]}-${String(mi + 1).padStart(2, '0')}`;
  m = /(\d{4})/.exec(s);
  if (m) { if (flag) flag.approx = true; return `${m[1]}-${fallback}`; }
  return undefined;
}

const BULLET = /^\s*(?:[-•*·▪◦–—]|\d+[.)])\s+/;

/** Testo semplice con a capo → paragrafi; le righe che iniziano con un punto elenco diventano liste. */
export function textToRich(text: string | undefined): RichText | undefined {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  const out: Block[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) out.push({ type: 'ul', items: list.map((t) => [{ text: t }]) }); list = []; };
  for (const l of lines) {
    if (!l) { flush(); continue; }
    if (BULLET.test(l)) list.push(l.replace(BULLET, ''));
    else { flush(); out.push({ type: 'p', content: [{ text: l }] }); }
  }
  flush();
  return out.length ? out : undefined;
}

const range = (start: string | undefined, end: string | undefined, flag: { approx: boolean }, openIsCurrent: boolean): DateRange => {
  const r: DateRange = {};
  const s = linkedInMonth(start, '01', flag), e = linkedInMonth(end, '12', flag);
  if (s) r.start = s;
  if (e) r.end = e;
  else if (s && openIsCurrent) r.current = true;
  return r;
};

const LANGUAGE_LEVELS: Array<[RegExp, string, number]> = [
  [/native|bilingual/i, 'Native', 5],
  [/full professional/i, 'Fluent', 4],
  [/professional working/i, 'Professional', 3],
  [/limited working/i, 'Limited working', 2],
  [/elementary/i, 'Elementary', 1],
];

const cut = (s: string | undefined, max: number) => (s ? s.slice(0, max) : undefined) || undefined;

/** `files`: nome file (qualsiasi maiuscolo) → contenuto testuale del CSV. */
export function linkedInToCv(files: Record<string, string>): LinkedInImport {
  const byName = new Map(Object.entries(files).map(([k, v]) => [k.toLowerCase(), v]));
  const rec = (name: string, key: string) => { const t = byName.get(name); return t ? csvRecords(t, key) : []; };
  const flag = { approx: false };

  const prof = rec('profile.csv', 'First Name')[0];
  const fullName = [prof?.['First Name'], prof?.['Last Name']].filter(Boolean).join(' ') || undefined;
  const websites = [...(prof?.['Websites'] ?? '').matchAll(/https?:\/\/[^\s,\]]+/g)].map((m) => m[0]);

  const emails = rec('email addresses.csv', 'Email Address').filter((r) => r['Email Address']);
  const email = (emails.find((r) => /^yes$/i.test(r['Primary'] ?? '')) ?? emails[0])?.['Email Address'];
  const phone = [...rec('phonenumbers.csv', 'Number'), ...rec('phone numbers.csv', 'Number')].find((r) => r['Number'])?.['Number'];

  const experience = rec('positions.csv', 'Company Name').filter((r) => r['Title'] || r['Company Name']).map((r): ExperienceItem => ({
    id: newId(), role: cut(r['Title'], 120) ?? '', company: cut(r['Company Name'], 120), location: cut(r['Location'], 120),
    dates: range(r['Started On'], r['Finished On'], flag, true), description: textToRich(r['Description']),
  }));

  const education = rec('education.csv', 'School Name').filter((r) => r['School Name'] || r['Degree Name']).map((r): EducationItem => ({
    id: newId(), degree: cut(r['Degree Name'], 120) || cut(r['School Name'], 120) || '', school: r['Degree Name'] ? cut(r['School Name'], 120) : undefined,
    dates: range(r['Start Date'], r['End Date'], flag, false),
    description: textToRich([r['Notes'], r['Activities']].filter(Boolean).join('\n\n')),
  }));

  const certifications = rec('certifications.csv', 'Name').filter((r) => r['Name']).map((r): CertItem => ({
    id: newId(), name: cut(r['Name'], 160)!, issuer: cut(r['Authority'], 120),
    date: linkedInMonth(r['Started On'], '01', flag), url: /^https?:\/\//i.test(r['Url'] ?? '') ? r['Url'] : undefined,
  }));

  const skills = rec('skills.csv', 'Name').map((r) => r['Name']).filter((n): n is string => Boolean(n))
    .map((name): Skill => ({ id: newId(), name: name.slice(0, 80) }));

  const languages = rec('languages.csv', 'Name').filter((r) => r['Name']).map((r): LanguageItem => {
    const hit = LANGUAGE_LEVELS.find(([re]) => re.test(r['Proficiency'] ?? ''));
    return { id: newId(), name: r['Name']!.slice(0, 60), level: hit?.[1] ?? '', value: hit?.[2] };
  });

  const projects = rec('projects.csv', 'Title').filter((r) => r['Title']).map((r): ProjectItem => ({
    id: newId(), name: r['Title']!.slice(0, 120), description: textToRich(r['Description']),
    url: /^https?:\/\//i.test(r['Url'] ?? '') ? r['Url'] : undefined,
  }));

  return {
    fullName, headline: cut(prof?.['Headline'], 160), location: cut(prof?.['Geo Location'], 120), email, phone, websites,
    profile: textToRich(prof?.['Summary']),
    experience, education, certifications, skills, languages, projects, approxDates: flag.approx,
  };
}

/** Sezioni per cui l'export contiene dati (le altre non vengono proposte). */
export function availableSections(d: LinkedInImport): ImportSection[] {
  const has: Record<ImportSection, boolean> = {
    personal: Boolean(d.fullName || d.headline || d.email || d.phone || d.location || d.websites.length),
    profile: Boolean(d.profile), experience: d.experience.length > 0, education: d.education.length > 0,
    certifications: d.certifications.length > 0, skills: d.skills.length > 0, languages: d.languages.length > 0, projects: d.projects.length > 0,
  };
  return (Object.keys(has) as ImportSection[]).filter((k) => has[k]);
}

/** Imposta (o aggiunge) il contatto di un certo tipo. */
function upsertContact(list: ContactItem[], kind: ContactKind, value: string | undefined): ContactItem[] {
  if (!value) return list;
  const i = list.findIndex((c) => c.kind === kind);
  if (i < 0) return [...list, { id: newId(), kind, value, visible: true }];
  return list.map((c, j) => (j === i ? { ...c, value } : c));
}

/**
 * Applica le sezioni scelte: ciascuna SOSTITUISCE quella attuale (di solito il segnaposto); i dati personali aggiornano solo i
 * campi presenti nell'export. Il resto del documento (design, sezioni personalizzate, titoli) non cambia.
 */
export function applyLinkedIn(doc: CvDocument, d: LinkedInImport, pick: ReadonlySet<ImportSection>): CvDocument {
  const next: CvDocument = { ...doc };
  if (pick.has('personal')) {
    // i contatti segnaposto del CV di esempio (identici al valore predefinito) non hanno senso accanto a dati reali
    const placeholders = new Set(sampleCv(doc.locale).personal.contacts.map((c) => `${c.kind}|${c.value}`));
    let contacts = doc.personal.contacts.filter((c) => !placeholders.has(`${c.kind}|${c.value}`));
    contacts = upsertContact(contacts, 'email', d.email);
    contacts = upsertContact(contacts, 'phone', d.phone);
    contacts = upsertContact(contacts, 'location', d.location);
    for (const w of d.websites) {
      const kind: ContactKind = /linkedin\.com/i.test(w) ? 'linkedin' : /github\.com/i.test(w) ? 'github' : 'website';
      const clean = w.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
      if (!contacts.some((c) => c.value === clean)) contacts = upsertContact(contacts, kind, clean);
    }
    next.personal = { ...doc.personal, fullName: d.fullName ?? doc.personal.fullName, headline: d.headline ?? doc.personal.headline, contacts };
  }
  if (pick.has('profile') && d.profile) next.profile = d.profile;
  if (pick.has('experience')) next.experience = d.experience;
  if (pick.has('education')) next.education = d.education;
  if (pick.has('certifications')) next.certifications = d.certifications;
  if (pick.has('skills')) next.skills = [{ id: newId(), skills: d.skills }];
  if (pick.has('languages')) next.languages = d.languages;
  if (pick.has('projects')) next.projects = d.projects;
  return next;
}

/** Legge lo ZIP dell'export (o i singoli CSV già estratti) e restituisce i testi dei file utili. */
export async function readLinkedInFiles(files: File[]): Promise<Record<string, string>> {
  const { readZip } = await import('./zip');
  const out: Record<string, string> = {};
  const dec = new TextDecoder();
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type.includes('zip')) {
      for (const [name, data] of await readZip(await f.arrayBuffer(), isLinkedInFile)) out[name] = dec.decode(data);
    } else if (isLinkedInFile(f.name)) out[f.name] = await f.text();
  }
  return out;
}
