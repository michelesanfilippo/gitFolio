import { parse, stringify, YAMLParseError } from 'yaml';
import { CONTACT_KINDS } from '@/core/icons/contact-icons';
import { astToMarkdown, markdownToAst } from '@/core/richtext/markdown';
import { cleanContent } from '@/core/saved/saved-cv';
import { CUSTOM_PREFIX, newId, type ContactItem, type CvDocument, type DateRange } from '@/core/schema/cv';

// Vista YAML del CV (ispirata a RenderCV): stessi contenuti della scheda Content in forma di testo. I testi lunghi usano
// un markdown leggero (**grassetto**, _corsivo_, "- " per gli elenchi). La foto non compare: resta quella del CV.

const CONTACT_SET = new Set<string>(CONTACT_KINDS);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strip = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length))) as T;

const datesOut = (d: DateRange) => strip({ start: d.start, end: d.current ? 'present' : d.end });

export function toYaml(doc: CvDocument): string {
  const data = strip({
    name: doc.personal.fullName,
    headline: doc.personal.headline,
    locale: doc.locale,
    contacts: doc.personal.contacts.map((c) => strip({ [c.kind]: c.value, hidden: c.visible ? undefined : true })),
    summary: astToMarkdown(doc.profile),
    experience: doc.experience.map((e) => strip({ role: e.role, company: e.company, location: e.location, ...datesOut(e.dates), description: astToMarkdown(e.description) })),
    education: doc.education.map((e) => strip({ degree: e.degree, school: e.school, location: e.location, ...datesOut(e.dates), description: astToMarkdown(e.description) })),
    skills: doc.skills.map((g) => strip({ group: g.name, items: g.skills.map((s) => (s.level ? strip({ name: s.name, level: s.level }) : s.name)) })),
    languages: doc.languages.map((l) => strip({ name: l.name, level: l.level, bar: l.value })),
    certifications: doc.certifications.map((c) => strip({ name: c.name, issuer: c.issuer, date: c.date, url: c.url })),
    projects: doc.projects.map((p) => strip({ name: p.name, role: p.role, url: p.url, tech: p.tech, description: astToMarkdown(p.description) })),
    sections: doc.custom.map((c) => strip({ title: c.title, text: astToMarkdown(c.body) })),
    titles: Object.keys(doc.sectionTitles).length ? doc.sectionTitles : undefined,
    hidden: doc.hiddenSections,
  });
  return stringify(data, { lineWidth: 0, blockQuote: 'literal' });
}

export type FromYaml = { ok: true; doc: CvDocument } | { ok: false; error: string };

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined);
const month = (v: unknown): string | undefined => {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}`;
  const s = str(v)?.trim();
  if (!s) return undefined;
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(s);
  return m ? `${m[1]}-${(m[2] ?? '01').padStart(2, '0')}` : undefined;
};
const datesIn = (o: Record<string, unknown>): DateRange => {
  const r: DateRange = {};
  const s = month(o.start), endRaw = str(o.end)?.trim().toLowerCase();
  if (s) r.start = s;
  if (endRaw && /^(present|current|now|presente|attuale|oggi)$/.test(endRaw)) r.current = true;
  else if (o.current === true) r.current = true;
  else { const e = month(o.end); if (e) r.end = e; }
  return r;
};
const items = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isObj) : []);
/** Riusa gli id della voce nella stessa posizione (le chiavi React restano stabili). */
const keep = <T extends { id: string }>(prev: T[] | undefined, i: number) => prev?.[i]?.id ?? newId();

/** Testo YAML → documento validato. `prev` fornisce foto e id stabili. */
export function fromYaml(text: string, prev: CvDocument): FromYaml {
  let raw: unknown;
  try {
    raw = parse(text, { maxAliasCount: 50 });
  } catch (e) {
    const msg = e instanceof YAMLParseError ? `${e.message.split('\n')[0]}${e.linePos?.[0] ? ` (line ${e.linePos[0].line})` : ''}` : String(e);
    return { ok: false, error: msg };
  }
  if (raw === null || raw === undefined) return { ok: false, error: 'The document is empty.' };
  if (!isObj(raw)) return { ok: false, error: 'The document must be a list of fields (name:, experience:, …).' };
  const o = raw;

  const contacts: ContactItem[] = (Array.isArray(o.contacts) ? o.contacts : []).flatMap((c, i): ContactItem[] => {
    if (!isObj(c)) return [];
    const kind = Object.keys(c).find((k) => CONTACT_SET.has(k));
    if (!kind) return [];
    return [{ id: keep(prev.personal.contacts, i), kind: kind as ContactItem['kind'], value: str(c[kind]) ?? '', visible: c.hidden !== true }];
  });

  const content = {
    locale: o.locale,
    personal: { fullName: str(o.name) ?? '', headline: str(o.headline), photo: prev.personal.photo, contacts },
    profile: markdownToAst(str(o.summary)),
    experience: items(o.experience).map((e, i) => ({ id: keep(prev.experience, i), role: str(e.role) ?? '', company: str(e.company), location: str(e.location), dates: datesIn(e), description: markdownToAst(str(e.description)) })),
    education: items(o.education).map((e, i) => ({ id: keep(prev.education, i), degree: str(e.degree) ?? '', school: str(e.school), location: str(e.location), dates: datesIn(e), description: markdownToAst(str(e.description)) })),
    skills: items(o.skills).map((g, i) => ({
      id: keep(prev.skills, i), name: str(g.group) ?? str(g.name),
      skills: (Array.isArray(g.items) ? g.items : []).map((s, j) => (isObj(s) ? { id: keep(prev.skills[i]?.skills, j), name: str(s.name) ?? '', level: typeof s.level === 'number' ? s.level : undefined } : { id: keep(prev.skills[i]?.skills, j), name: str(s) ?? '' })),
    })),
    languages: items(o.languages).map((l, i) => ({ id: keep(prev.languages, i), name: str(l.name) ?? '', level: str(l.level) ?? '', value: typeof l.bar === 'number' ? l.bar : undefined })),
    certifications: items(o.certifications).map((c, i) => ({ id: keep(prev.certifications, i), name: str(c.name) ?? '', issuer: str(c.issuer), date: month(c.date), url: str(c.url) })),
    projects: items(o.projects).map((p, i) => ({
      id: keep(prev.projects, i), name: str(p.name) ?? '', role: str(p.role), url: str(p.url), description: markdownToAst(str(p.description)),
      tech: Array.isArray(p.tech) ? p.tech.map(str).filter(Boolean) : typeof p.tech === 'string' ? p.tech.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    })),
    custom: items(o.sections).map((c, i) => ({ id: prev.custom[i]?.id ?? `${CUSTOM_PREFIX}${newId()}`, title: str(c.title) ?? '', body: markdownToAst(str(c.text)) ?? [] })),
    sectionTitles: isObj(o.titles) ? o.titles : {},
    hiddenSections: Array.isArray(o.hidden) ? o.hidden : [],
  };
  return { ok: true, doc: cleanContent(content, prev) };
}
