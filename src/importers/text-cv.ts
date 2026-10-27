import type { Block, RichText } from '@/core/richtext/ast';
import {
  newId, CUSTOM_PREFIX, type CertItem, type ContactItem, type CvDocument, type EducationItem, type ExperienceItem, type LanguageItem,
  type Locale, type ProjectItem, type SkillGroup,
} from '@/core/schema/cv';
import { findRange, findSingleDate } from './dates';

// CV esistente (testo estratto da PDF, DOCX o file di testo) → contenuti di gitFolio. Lettura euristica, pensata per i CV
// più comuni: titoli di sezione riconosciuti in en/it/fr/de/es, voci separate dalle date, contatti trovati con espressioni
// regolari. L'utente rivede e corregge tutto nella scheda Content.

/** Riga di testo con gli indizi di impaginazione disponibili (il testo semplice non ne ha). */
export interface TextLine { text: string; bold?: boolean; size?: number; bullet?: boolean }

type Section = 'profile' | 'experience' | 'education' | 'skills' | 'languages' | 'certifications' | 'projects' | 'other';

const HEADINGS: Array<[Section, RegExp]> = [
  ['profile', /^(summary|professional summary|profile|professional profile|about( me)?|objective|career objective|riepilogo|profilo( professionale)?|sommario|chi sono|presentazione|profil|à propos|résumé|zusammenfassung|über mich|perfil|extracto|acerca de|resumen)$/i],
  ['experience', /^((work|professional|employment) (experience|history)|experience|career|employment|esperienz[ae]( professional[ei]| lavorativ[ae])?|expérience(s)?( professionnelle(s)?)?|berufserfahrung|berufliche erfahrung|experiencia( profesional| laboral)?)$/i],
  ['education', /^(education( and training)?|academic background|studies|formazione|istruzione( e formazione)?|studi|titoli di studio|formation|études|ausbildung|bildung|studium|educación|formación( académica)?|estudios)$/i],
  ['skills', /^((technical |core |key |professional |it )?skills( & tools)?|competenc(e|ie)s?|competenze( tecniche| professionali)?|conoscenze( tecniche)?|compétences|kenntnisse|fähigkeiten|habilidades|competencias|aptitudes|tecnologie|technologies|tools)$/i],
  ['languages', /^(languages?|language skills|lingue( conosciute| straniere)?|langues|sprachen|sprachkenntnisse|idiomas)$/i],
  ['certifications', /^(certifications?( & licenses)?|licenses( & certifications)?|certificazioni|certificati|attestati|certificats?|zertifikate|zertifizierungen|certificaciones)$/i],
  ['projects', /^((personal |side |key )?projects?|progetti( personali)?|projets|projekte|proyectos)$/i],
  ['other', /^(interests|hobbies( and interests)?|interessi|hobby|centres d'intérêt|interessen|intereses|volunteer(ing)?( experience)?|volontariato|bénévolat|ehrenamt|voluntariado|awards|honors( & awards)?|premi( e riconoscimenti)?|prix|auszeichnungen|premios|publications|pubblicazioni|publikationen|publicaciones|references|referenze|références|referenzen|referencias|additional information|altre informazioni|informations complémentaires|weitere informationen|información adicional|courses|corsi|training|achievements|conferences|patents|brevetti)$/i],
];

const headingOf = (t: string): Section | undefined => {
  const s = t.replace(/[:\-–—.]+$/, '').replace(/\s+/g, ' ').trim();
  if (!s || s.split(' ').length > 4) return undefined;
  return HEADINGS.find(([, re]) => re.test(s))?.[0];
};

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4})?/;
const LINKEDIN = /(?:https?:\/\/)?(?:[\w.]+\.)?linkedin\.com\/in\/[\w%.-]+\/?/i;
const GITHUB = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+\/?/i;
const URL_RE = /(?:https?:\/\/|www\.)[^\s|,;)]+|\b[\w-]+\.(?:com|io|dev|it|org|net|me|eu|co\.uk|fr|de|es|app|tech)\b(?:\/[^\s|,;)]*)?/i;
const CONTACT_LABEL = /^(e-?mail|mail|tel(efono|\.)?|phone|mobile|cell(ulare)?|address|indirizzo|location|città|web|site|sito|linkedin|github|portfolio|website)\s*[:.]?\s*/i;
const BULLET = /^\s*(?:[-•*·▪◦‣–—]|\d+[.)])\s+/;
const COMPANY_HINT = /\b(inc|ltd|llc|gmbh|ag|s\.?p\.?a|s\.?r\.?l|s\.?a\.?s|srl|spa|sas|sa|plc|corp|co|group|bank|banca|studio|agency|consulting|technologies|solutions|software|labs?|university|università|universidad|université|universität|politecnico|institute|istituto|school|college|liceo|academy)\b\.?/i;
const SCHOOL_HINT = /\b(university|università|universidad|université|universität|politecnico|polytechnic|institute|istituto|institut|school|scuola|école|hochschule|college|liceo|lycée|gymnasium|academy|accademia|ITIS|ITS)\b/i;
const LEVELS: Array<[RegExp, number]> = [
  [/\b(native|mother ?tongue|madrelingua|bilingu[ea]l?|langue maternelle|muttersprache|nativo|c2)\b/i, 5],
  [/\b(fluent|fluente|proficien(t|cy)|advanced|avanzato|avancé|fließend|avanzado|c1)\b/i, 4],
  [/\b(upper[- ]intermediate|intermedio avanzato|professional|b2|good|buono|bon|gut|bueno)\b/i, 3],
  [/\b(intermediate|intermedio|intermédiaire|mittel|b1|conversational)\b/i, 3],
  [/\b(pre[- ]intermediate|elementary|elementare|basic|base|basique|grundkenntnisse|básico|a2|beginner|principiante|a1|scolastico)\b/i, 2],
];

export interface ImportResult {
  doc: CvDocument;
  /** Sezioni trovate, per il messaggio all'utente. */
  found: string[];
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const cut = (s: string | undefined, n: number) => { const t = s ? clean(s).slice(0, n) : ''; return t || undefined; };

/** Righe → testo ricco: punti elenco in liste, il resto in paragrafi (righe contigue si uniscono). */
export function linesToRich(lines: TextLine[]): RichText | undefined {
  const out: Block[] = [];
  let para: string | undefined;
  let items: string[] = [];
  const flushPara = () => { if (para) out.push({ type: 'p', content: [{ text: para }] }); para = undefined; };
  const flushList = () => { if (items.length) out.push({ type: 'ul', items: items.map((t) => [{ text: t }]) }); items = []; };
  for (const l of lines) {
    const t = clean(l.text);
    if (!t) { flushPara(); flushList(); continue; }
    if (l.bullet || BULLET.test(t)) { flushPara(); items.push(t.replace(BULLET, '')); }
    else if (items.length && /^\p{Ll}/u.test(t)) items[items.length - 1] = `${items[items.length - 1]} ${t}`; // riga spezzata di una voce
    else if (para && /^\p{Ll}/u.test(t) && !/[.!?:]$/.test(para)) para = `${para} ${t}`;
    else { flushPara(); flushList(); para = t; }
  }
  flushPara(); flushList();
  return out.length ? out : undefined;
}

/* --------------------------------------------------------------- contatti */

function contacts(lines: TextLine[]): { items: ContactItem[]; used: Set<number> } {
  const items: ContactItem[] = [];
  const used = new Set<number>();
  const seen = new Set<string>();
  const add = (kind: ContactItem['kind'], value: string | undefined) => {
    const v = cut(value?.replace(/^(https?:\/\/)?(www\.)?/i, (m) => (kind === 'website' || kind === 'link' ? '' : m)).replace(/\/$/, ''), 200);
    if (!v || seen.has(`${kind}:${v.toLowerCase()}`)) return;
    if (items.some((c) => c.kind === kind) && kind !== 'link' && kind !== 'website') return;
    seen.add(`${kind}:${v.toLowerCase()}`);
    items.push({ id: newId(), kind, value: v, visible: true });
  };
  lines.forEach((l, i) => {
    const t = clean(l.text);
    let hit = false;
    const e = EMAIL.exec(t); if (e) { add('email', e[0]); hit = true; }
    const li = LINKEDIN.exec(t); if (li) { add('linkedin', li[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '')); hit = true; }
    const gh = GITHUB.exec(t); if (gh) { add('github', gh[0].replace(/^https?:\/\//i, '').replace(/^www\./i, '')); hit = true; }
    const noLinks = t.replace(LINKEDIN, '').replace(GITHUB, '').replace(EMAIL, '');
    const u = URL_RE.exec(noLinks); if (u && !/^\d/.test(u[0])) { add('website', u[0]); hit = true; }
    const rest = noLinks.replace(URL_RE, '');
    const ph = PHONE.exec(rest);
    if (ph && ph[0].replace(/\D/g, '').length >= 8 && ph[0].replace(/\D/g, '').length <= 15 && !/\d{4}\s*[-–]\s*\d{4}/.test(ph[0])) { add('phone', ph[0].trim()); hit = true; }
    if (hit) {
      // la stessa riga può portare anche la città: "Milano, Italia | +39 …"
      const leftovers = rest.replace(PHONE, '').split(/\s*[|•·]\s*/).map((x) => clean(x.replace(CONTACT_LABEL, ''))).filter((x) => x && /^\p{Lu}[\p{L}\s.'-]+(,\s*[\p{L}\s.'-]+)?$/u.test(x) && x.length <= 40);
      if (leftovers[0]) add('location', leftovers[0]);
      used.add(i);
    }
  });
  return { items, used };
}

/* ------------------------------------------------------------- intestazione */

const looksLikeName = (t: string) => {
  const words = t.split(' ');
  return words.length >= 2 && words.length <= 5 && words.every((w) => /^[\p{Lu}][\p{L}'’.-]*$/u.test(w) || /^(de|di|da|del|della|van|von|der|la|le|du|dos|das|e|y)$/i.test(w));
};

interface Entry { head: string[]; range: ReturnType<typeof findRange>; body: TextLine[] }

/** Divide le righe di una sezione in voci: ogni intervallo di date apre una voce; le righe prima sono il suo titolo. */
function entries(lines: TextLine[]): Entry[] {
  const out: Entry[] = [];
  let pending: TextLine[] = []; // righe di titolo in attesa della data
  let cur: Entry | undefined;
  for (const l of lines) {
    const t = clean(l.text);
    if (!t) continue;
    const r = !l.bullet && !BULLET.test(t) ? findRange(t) : undefined;
    if (r) {
      // una nuova voce: le righe corte non puntate subito prima sono il suo titolo
      const head = [...pending.map((p) => clean(p.text))];
      if (r.rest) head.push(r.rest);
      if (cur && !head.length) { // la data da sola sotto il titolo già letto come corpo? prendi le ultime righe corte del corpo
        while (cur.body.length && !cur.body[cur.body.length - 1]!.bullet && clean(cur.body[cur.body.length - 1]!.text).length <= 70) head.unshift(clean(cur.body.pop()!.text));
      }
      cur = { head, range: r, body: [] };
      out.push(cur);
      pending = [];
      continue;
    }
    const short = !l.bullet && !BULLET.test(t) && t.length <= 70 && !/[.!?]$/.test(t);
    if (!cur) { if (short) pending.push(l); else pending = []; continue; }
    if (short && (l.bold || pending.length) && cur.body.length) { pending.push(l); continue; } // probabile titolo della voce successiva
    if (pending.length) { cur.body.push(...pending); pending = []; }
    cur.body.push(l);
  }
  if (cur && pending.length) cur.body.push(...pending);
  return out;
}

/** "Senior Developer at Acme" / "Senior Developer – Acme, Milan" / due righe → ruolo, azienda, luogo. */
function splitHead(head: string[], hint: RegExp): { a: string; b?: string; location?: string } {
  const parts = head.flatMap((h) => h.split(/\s+(?:at|presso|chez|bei|en|@)\s+|\s*[|•·]\s*|\s+[–—]\s+|\s+-\s+/i)).map(clean).filter(Boolean);
  if (!parts.length) return { a: '' };
  let location: string | undefined;
  if (parts.length >= 3 && /^[\p{Lu}][\p{L}\s.'-]+(,\s*[\p{L}\s.'-]+)?$/u.test(parts[parts.length - 1]!) && parts[parts.length - 1]!.length <= 40) location = parts.pop();
  if (parts.length === 1) {
    const m = /^(.*?),\s*(.+)$/.exec(parts[0]!);
    if (m && hint.test(m[2]!)) return { a: m[1]!, b: m[2]!, location };
    return { a: parts[0]!, location };
  }
  // "Acme Inc, Milan" come seconda parte: la città dopo la virgola è il luogo
  if (!location && parts.length === 2) {
    const m = /^(.+?),\s*([\p{Lu}][\p{L}\s.'-]{1,40})$/u.exec(parts[1]!);
    if (m && !hint.test(m[2]!)) { parts[1] = m[1]!; location = m[2]; }
  }
  const [x, y] = [parts[0]!, parts.slice(1).join(', ')];
  return hint.test(x) && !hint.test(y) ? { a: y, b: x, location } : { a: x, b: y, location };
}

/** Prima riga del corpo come seconda riga del titolo ("Ruolo | data" e poi "Azienda · Città" sotto). */
function takeSubtitle(e: Entry): string | undefined {
  const first = e.body[0];
  if (!first) return undefined;
  const t = clean(first.text);
  const words = t.split(' ').length;
  // una frase (lunga, con punto finale) resta nel corpo; "Initech S.p.A." è un titolo
  if (first.bullet || BULLET.test(t) || t.length > 70 || words > 8 || /[!?:]$/.test(t) || (/\.$/.test(t) && words > 5)) return undefined;
  e.body.shift();
  return t;
}

/** "Azienda · Città" sotto il titolo: nome e luogo. */
function subtitleParts(e: Entry): { b?: string; location?: string } {
  const sub = takeSubtitle(e);
  if (!sub) return {};
  const s = splitHead([sub], /$^/);
  return { b: s.a, location: s.location ?? s.b };
}

function experience(lines: TextLine[]): ExperienceItem[] {
  return entries(lines).map((e): ExperienceItem => {
    let { a, b, location } = splitHead(e.head, COMPANY_HINT);
    if (!b) { const s = subtitleParts(e); b = s.b; location ??= s.location; }
    return { id: newId(), role: cut(a, 120) ?? '', company: cut(b, 120), location: cut(location, 120), dates: e.range?.range ?? {}, description: linesToRich(e.body) };
  }).filter((e) => e.role || e.company);
}

function education(lines: TextLine[]): EducationItem[] {
  const es = entries(lines);
  // senza date: ogni riga corta è una voce
  const list = es.length ? es : lines.filter((l) => clean(l.text)).map((l): Entry => ({ head: [clean(l.text)], range: undefined, body: [] }));
  return list.map((e): EducationItem => {
    let head = e.head, dates = e.range?.range ?? {};
    if (!e.range && head.length) { const d = findSingleDate(head[head.length - 1]!); if (d) { dates = { end: d.month }; head = [...head.slice(0, -1), d.rest].filter(Boolean); } }
    let { a, b, location } = splitHead(head, SCHOOL_HINT);
    if (!b) { const s = subtitleParts(e); b = s.b; location ??= s.location; }
    return { id: newId(), degree: cut(a, 120) ?? '', school: cut(b, 120), location: cut(location, 120), dates, description: linesToRich(e.body) };
  }).filter((e) => e.degree || e.school);
}

const splitList = (t: string) => t.split(/\s*[,;|•·]\s*|\s{2,}|\t/).map(clean).filter(Boolean);

function skills(lines: TextLine[]): SkillGroup[] {
  const groups: SkillGroup[] = [];
  let loose: string[] = [], groupName: string | undefined;
  const flushLoose = () => { if (loose.length) groups.push({ id: newId(), name: groupName, skills: loose.map((n) => ({ id: newId(), name: n.slice(0, 80) })) }); loose = []; groupName = undefined; };
  const texts = lines.map((l) => clean(l.text).replace(BULLET, '')).filter(Boolean);
  texts.forEach((t, i) => {
    const m = /^([^:]{2,40}):\s*(.+)$/.exec(t);
    if (m) { flushLoose(); groups.push({ id: newId(), name: m[1]!.slice(0, 80), skills: splitList(m[2]!).map((n) => ({ id: newId(), name: n.slice(0, 80) })) }); return; }
    const items = splitList(t);
    const next = texts[i + 1];
    // "Linguaggi" da solo su una riga, seguito da un elenco: è il nome del gruppo
    if (items.length === 1 && t.split(' ').length <= 3 && next && splitList(next).length > 1) { flushLoose(); groupName = t.slice(0, 80); return; }
    loose.push(...items.filter((x) => x.length <= 60));
  });
  flushLoose();
  return groups.filter((g) => g.skills.length).slice(0, 20);
}

function languages(lines: TextLine[]): LanguageItem[] {
  const out: LanguageItem[] = [];
  for (const l of lines) {
    const t = clean(l.text).replace(BULLET, '');
    if (!t) continue;
    // "English (C1), Italian: native" → più lingue sulla stessa riga solo se separate da virgola/punto e virgola
    for (const part of t.split(/\s*[;,|•·]\s*(?=\p{Lu})/u)) {
      const m = /^([\p{L}\s]+?)\s*(?:[:(–—-]\s*|\s+)([^()]*?)\)?\s*$/u.exec(part);
      const name = clean(m?.[1] ?? part), level = clean(m?.[2] ?? '');
      if (!name || name.split(' ').length > 3) continue;
      const value = LEVELS.find(([re]) => re.test(level || name))?.[1];
      out.push({ id: newId(), name: name.slice(0, 60), level: level.slice(0, 40), value });
    }
  }
  return out.slice(0, 20);
}

function certifications(lines: TextLine[]): CertItem[] {
  const out: CertItem[] = [];
  for (const l of lines) {
    const t = clean(l.text).replace(BULLET, '');
    if (!t) continue;
    const r = findRange(t);
    const d = findSingleDate(t) ?? (r ? { month: r.range.end ?? r.range.start!, rest: r.rest } : undefined);
    const text = d ? d.rest : t;
    const url = URL_RE.exec(text)?.[0];
    const [name, issuer] = text.replace(URL_RE, '').split(/\s+[–—|-]\s+|\s*,\s*(?=[\p{Lu}])/u).map(clean);
    const prev = out[out.length - 1];
    // "Ente, 2022" sulla riga sotto il nome: completa la certificazione precedente invece di aprirne una nuova
    if (prev && !prev.date && !prev.issuer && !l.bullet && (d || !name) && (name ?? '').split(' ').length <= 5 && !issuer) {
      prev.issuer = cut(name, 120); prev.date = d?.month; prev.url ??= cut(url, 300);
      continue;
    }
    if (name && name.length > 2) out.push({ id: newId(), name: name.slice(0, 150), issuer: cut(issuer, 120), date: d?.month, url: cut(url, 300) });
  }
  return out;
}

function projects(lines: TextLine[]): ProjectItem[] {
  const out: ProjectItem[] = [];
  let cur: ProjectItem & { body: TextLine[] } | undefined;
  const push = () => { if (cur) { const { body, ...p } = cur; out.push({ ...p, description: linesToRich(body) }); } };
  for (const l of lines) {
    const t = clean(l.text);
    if (!t) continue;
    const isTitle = !l.bullet && !BULLET.test(t) && t.length <= 70 && !/[.!?]$/.test(t) && (l.bold || !cur || cur.body.length > 0);
    if (isTitle) {
      push();
      const r = findRange(t);
      const [name, role] = (r?.rest ?? t).split(/\s+[–—|-]\s+|\s*:\s*/).map(clean);
      const url = URL_RE.exec(t)?.[0];
      cur = { id: newId(), name: (name || t).replace(URL_RE, '').trim().slice(0, 120), role: cut(role?.replace(URL_RE, ''), 120), url: cut(url, 300), body: [] };
    } else if (cur) cur.body.push(l);
  }
  push();
  return out.filter((p) => p.name);
}

/* ------------------------------------------------------------------ main */

/** Testo (già diviso in righe) → documento. `base` fornisce lingua e campi che il testo non copre (foto). */
export function parseCvText(lines: TextLine[], base: CvDocument): ImportResult {
  const all = lines.map((l) => ({ ...l, text: clean(l.text) })).filter((l) => l.text && !/^(page|pagina|seite|página)\s+\d+(\s+(of|di|von|de|sur)\s+\d+)?$/i.test(l.text));
  const { items: contactItems, used } = contacts(all);

  // sezioni: ogni titolo riconosciuto apre una parte; le righe prima del primo titolo sono l'intestazione
  const head: TextLine[] = [];
  const parts: Array<{ section: Section; title: string; lines: TextLine[] }> = [];
  let cur: typeof parts[number] | undefined;
  all.forEach((l, i) => {
    const s = headingOf(l.text);
    if (s && (l.bold || l.size === undefined || all.length < 3 || (l.size ?? 0) >= (median(all) ?? 0))) { cur = { section: s, title: l.text.replace(/[:\-–—.]+$/, '').trim(), lines: [] }; parts.push(cur); return; }
    if (used.has(i)) return;
    (cur ? cur.lines : head).push(l);
  });

  // nome: riga più grande dell'intestazione, altrimenti la prima che sembra un nome
  const bySize = [...head].sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  const nameLine = (bySize[0]?.size !== undefined && bySize[0].size > (bySize[1]?.size ?? 0) ? bySize[0] : undefined) ?? head.find((l) => looksLikeName(l.text)) ?? head[0];
  const fullName = cut(nameLine?.text, 100);
  const afterName = head.filter((l) => l !== nameLine);
  const headline = cut(afterName.find((l) => l.text.length <= 90 && !/^\p{Ll}/u.test(l.text))?.text, 120);
  // testo libero nell'intestazione (senza titolo "Summary"): diventa il profilo se è lungo
  const headRest = afterName.filter((l) => l.text !== headline && l.text.length > 90);
  const profilePart = parts.find((p) => p.section === 'profile');
  const profile = profilePart ? linesToRich(profilePart.lines) : linesToRich(headRest);

  const take = (s: Section) => parts.filter((p) => p.section === s).flatMap((p) => p.lines);
  const custom = parts.filter((p) => p.section === 'other').map((p) => ({ id: `${CUSTOM_PREFIX}${newId()}`, title: p.title.slice(0, 80), body: linesToRich(p.lines) ?? [] })).filter((c) => c.body.length);

  const doc: CvDocument = {
    locale: guessLocale(parts.map((p) => p.title)) ?? base.locale,
    personal: { fullName: fullName ?? '', headline, photo: base.personal.photo, contacts: contactItems },
    profile,
    experience: experience(take('experience')),
    education: education(take('education')),
    skills: skills(take('skills')),
    languages: languages(take('languages')),
    certifications: certifications(take('certifications')),
    projects: projects(take('projects')),
    custom,
    sectionTitles: {},
    hiddenSections: [],
  };
  const found = [
    fullName && 'name', contactItems.length && 'contacts', profile && 'summary', doc.experience.length && 'experience', doc.education.length && 'education',
    doc.skills.length && 'skills', doc.languages.length && 'languages', doc.certifications.length && 'certifications', doc.projects.length && 'projects',
    ...custom.map((c) => `“${c.title}”`),
  ].filter((x): x is string => typeof x === 'string');
  return { doc, found };
}

function median(lines: TextLine[]): number | undefined {
  const sizes = lines.map((l) => l.size).filter((s): s is number => s !== undefined).sort((a, b) => a - b);
  return sizes.length ? sizes[Math.floor(sizes.length / 2)] : undefined;
}

/** Lingua dei titoli di sezione trovati (serve per i titoli predefiniti nel PDF). */
function guessLocale(titles: string[]): Locale | undefined {
  const t = titles.join(' ').toLowerCase();
  if (/esperienz|formazione|istruzione|competenze|lingue|certificazioni|progetti|profilo/.test(t)) return 'it';
  if (/expérience|formation|compétences|langues|projets|profil\b/.test(t)) return 'fr';
  if (/berufserfahrung|ausbildung|kenntnisse|sprachen|zertifikate|projekte/.test(t)) return 'de';
  if (/experiencia|formación|educación|habilidades|idiomas|certificaciones|proyectos|perfil/.test(t)) return 'es';
  if (/experience|education|skills|languages|certifications|projects|summary|profile/.test(t)) return 'en';
  return undefined;
}

/** Testo semplice → righe (un file .txt o .md). */
export const textToLines = (text: string): TextLine[] => text.replace(/\r\n?/g, '\n').split('\n').map((t) => ({ text: t, bullet: BULLET.test(t) || undefined }));
