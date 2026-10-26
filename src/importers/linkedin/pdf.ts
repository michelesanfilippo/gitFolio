import type { Block, RichText } from '@/core/richtext/ast';
import { newId, type CertItem, type EducationItem, type ExperienceItem, type LanguageItem, type Skill } from '@/core/schema/cv';
import { cut, LANGUAGE_LEVELS, linkedInMonth, range, type LinkedInImport } from './map';

// PDF del profilo LinkedIn ("Resources → Save to PDF"): si scarica in pochi secondi, al contrario dell'export dati.
// Impaginazione nota: colonna laterale (Contact, Top Skills, Languages, Certifications) e colonna principale
// (nome, headline, località, Summary, Experience, Education). Lettura euristica: l'utente rivede tutto prima di importare.

export interface PdfLine { text: string; size: number; font: string; x: number; y: number; page: number }

const H = {
  summary: /^(summary|about|riepilogo|informazioni|sommario|résumé|zusammenfassung|extracto|acerca de)$/i,
  experience: /^(experience|esperienza|esperienze|expérience|berufserfahrung|experiencia)$/i,
  education: /^(education|formazione|istruzione|formation|ausbildung|educación|formación)$/i,
  contact: /^(contact|contatti|contatto|coordonnées|kontakt|contactar|información de contacto)$/i,
  skills: /^(top skills|competenze principali|principales compétences|top-kenntnisse|aptitudes principales)$/i,
  languages: /^(languages|lingue|langues|sprachen|idiomas)$/i,
  certifications: /^(certifications|certificazioni|zertifizierungen|certificaciones|licenses & certifications)$/i,
  other: /^(honors-awards|honors & awards|premi e riconoscimenti|publications|pubblicazioni|patents|brevetti|volunteer|volontariato)$/i,
};
type Section = keyof typeof H;

const FOOTER = /^(page|pagina|seite|página)\s+\d+\s+(of|di|von|de|sur)\s+\d+$/i;
const PRESENT = '(present|presente|attuale|oggi|aujourd’hui|aujourd\'hui|heute|actualidad|actualmente|hoy)';
const MONTH_YEAR = '(?:\\p{L}+\\.?\\s+)?\\d{4}';
const DATE_RE = new RegExp(`^(${MONTH_YEAR})\\s*[-–—]\\s*(${PRESENT}|${MONTH_YEAR})(?:\\s*\\(.*\\))?$`, 'iu');
const DURATION = /^(\d+\s+(years?|yrs?|months?|mos?|anni|anno|mesi|mese|ans?|mois|jahre?|monate?|años?|meses?)\s*)+$/i;
const BULLET = /^\s*(?:[-•*·▪◦–—]|\d+[.)])\s+/;

/** Unisce due righe di testo: una parola spezzata a fine riga ("engi-" + "neering") torna intera. */
export const joinLine = (a: string, b: string) => (/\p{Ll}-$/u.test(a) && /^\p{Ll}/u.test(b) ? a.slice(0, -1) + b : `${a} ${b}`);

const sectionOf = (t: string): Section | undefined => (Object.keys(H) as Section[]).find((k) => H[k].test(t.trim()));

/** Font più usato (per numero di caratteri): è quello del testo normale. */
function bodyStyle(lines: PdfLine[]) {
  const count = new Map<string, number>();
  for (const l of lines) count.set(`${l.font}|${l.size.toFixed(1)}`, (count.get(`${l.font}|${l.size.toFixed(1)}`) ?? 0) + l.text.length);
  const [key] = [...count.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['|10'];
  const [font, size] = key.split('|');
  return { font: font ?? '', size: Number(size) || 10 };
}

/** Righe → testo ricco: le righe spezzate dall'impaginazione si riuniscono; nuovo paragrafo se c'è più spazio verticale. */
export function linesToRich(lines: PdfLine[]): RichText | undefined {
  const out: Block[] = [];
  let para: string | undefined, items: string[] = [];
  const flushPara = () => { if (para) out.push({ type: 'p', content: [{ text: para }] }); para = undefined; };
  const flushList = () => { if (items.length) out.push({ type: 'ul', items: items.map((t) => [{ text: t }]) }); items = []; };
  let prev: PdfLine | undefined;
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) continue;
    const gap = prev && prev.page === l.page ? prev.y - l.y > l.size * 1.75 : false;
    if (BULLET.test(t)) { flushPara(); items.push(t.replace(BULLET, '')); }
    else if (gap || (!para && !items.length)) { flushPara(); flushList(); para = t; }
    else if (items.length) items[items.length - 1] = joinLine(items[items.length - 1]!, t);
    else para = joinLine(para!, t);
    prev = l;
  }
  flushPara(); flushList();
  return out.length ? out : undefined;
}

function split(lines: PdfLine[]): { head: PdfLine[]; parts: Map<Section, PdfLine[]> } {
  const parts = new Map<Section, PdfLine[]>();
  const head: PdfLine[] = [];
  let cur: PdfLine[] = head;
  for (const l of lines) {
    const s = sectionOf(l.text);
    if (s) { cur = []; if (!parts.has(s)) parts.set(s, cur); }
    else cur.push(l);
  }
  return { head, parts };
}

function experience(lines: PdfLine[], body: { font: string; size: number }, flag: { approx: boolean }): ExperienceItem[] {
  const emph = (l: PdfLine | undefined) => Boolean(l && (l.font !== body.font || l.size > body.size + 0.4));
  const dates = lines.map((l, i) => (DATE_RE.test(l.text.trim()) ? i : -1)).filter((i) => i > 0);
  const out: ExperienceItem[] = [];
  let company: string | undefined;
  const starts: number[] = [];
  const parsed = dates.map((i) => {
    const ti = i - 1;
    let j = ti - 1, start = ti;
    if (j >= 0 && DURATION.test(lines[j]!.text.trim())) j--;
    // azienda: riga in evidenza sopra il ruolo (eventualmente sopra la durata totale, se l'azienda ha più ruoli);
    // altrimenti è un altro ruolo nella stessa azienda della voce precedente
    if (j >= 0 && emph(lines[j]) && !DATE_RE.test(lines[j]!.text.trim())) { company = lines[j]!.text.trim(); start = j; }
    starts.push(start);
    return { i, title: lines[ti]!.text.trim(), company };
  });
  parsed.forEach(({ i, title, company: co }, k) => {
    const end = k + 1 < starts.length ? starts[k + 1]! : lines.length;
    let from = i + 1;
    const next = lines[from];
    let location: string | undefined;
    if (next && from < end && !emph(next) && !BULLET.test(next.text) && next.text.length <= 60 && !/[.:;!?]$/.test(next.text.trim()) && next.text.trim().split(/\s+/).length <= 7) {
      location = next.text.trim(); from++;
    }
    const m = DATE_RE.exec(lines[i]!.text.trim())!;
    out.push({
      id: newId(), role: cut(title, 120) ?? '', company: cut(co, 120), location: cut(location, 120),
      dates: range(m[1], new RegExp(`^${PRESENT}$`, 'i').test(m[2]!) ? undefined : m[2], flag, true),
      description: linesToRich(lines.slice(from, end)),
    });
  });
  return out;
}

function education(lines: PdfLine[], body: { font: string; size: number }, flag: { approx: boolean }): EducationItem[] {
  const emph = (l: PdfLine) => l.font !== body.font || l.size > body.size + 0.4;
  const out: EducationItem[] = [];
  let cur: { school: string; rest: string[] } | undefined;
  const push = () => {
    if (!cur) return;
    const text = cur.rest.join(' ').replace(/\s+/g, ' ').trim();
    const m = /^(.*?)\s*[·•]?\s*\(([^()]*)\)\s*$/.exec(text);
    const degree = (m ? m[1]! : text).replace(/[\s·•,]+$/, '').trim();
    const [s, e] = (m?.[2] ?? '').split(/\s*[-–—]\s*/);
    out.push({ id: newId(), degree: cut(degree, 120) || cut(cur.school, 120) || '', school: degree ? cut(cur.school, 120) : undefined, dates: range(s, e, flag, false) });
  };
  for (const l of lines) {
    if (emph(l)) { push(); cur = { school: l.text.trim(), rest: [] }; }
    else if (cur) cur.rest.push(l.text.trim());
  }
  push();
  return out;
}

/** Elementi della colonna laterale: le righe spezzate (parentesi aperte, trattini finali) si riuniscono. */
function sideItems(lines: PdfLine[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    const t = l.text.trim();
    const last = out[out.length - 1];
    if (last !== undefined && ((last.match(/\(/g)?.length ?? 0) > (last.match(/\)/g)?.length ?? 0) || /[-/]$/.test(last))) out[out.length - 1] = /[-/]$/.test(last) ? last + t : `${last} ${t}`;
    else out.push(t);
  }
  return out.filter(Boolean);
}

/** Righe delle due colonne (in ordine di lettura) → contenuti del CV. */
export function parseLinkedInPdf(main: PdfLine[], side: PdfLine[]): LinkedInImport {
  const flag = { approx: false };
  main = main.filter((l) => !FOOTER.test(l.text.trim()) && l.text.trim());
  side = side.filter((l) => !FOOTER.test(l.text.trim()) && l.text.trim());
  const body = bodyStyle(main);
  const { head, parts } = split(main);
  const nameIdx = head.reduce((best, l, i) => (l.size > (head[best]?.size ?? 0) ? i : best), 0);
  const afterName = head.slice(nameIdx + 1).map((l) => l.text.trim());
  const location = afterName.length >= 2 ? afterName[afterName.length - 1] : undefined;
  const headline = (afterName.length >= 2 ? afterName.slice(0, -1) : afterName).reduce((a, b) => (a ? joinLine(a, b) : b), '') || undefined;

  const sideParts = split(side).parts;
  const contact = sideItems(sideParts.get('contact') ?? []);
  const all = contact.join('\n');
  const email = /[\w.+-]+@[\w-]+(\.[\w-]+)+/.exec(all)?.[0];
  const phone = contact.map((c) => /^(\+?[\d][\d\s().-]{5,}\d)\s*(\(.*\))?$/.exec(c)?.[1]).find(Boolean);
  const websites: string[] = [];
  const li = /(?:www\.)?linkedin\.com\/in\/[\w%-]+/i.exec(all.replace(/\s+/g, ''))?.[0];
  if (li) websites.push(`https://${li.replace(/^www\./i, 'www.')}`);
  for (const c of contact) {
    const m = /^(\S+\.\S+)\s*\((?!linkedin)[^)]*\)$/i.exec(c);
    if (m && !/linkedin\.com/i.test(m[1]!) && !m[1]!.includes('@')) websites.push(/^https?:\/\//.test(m[1]!) ? m[1]! : `https://${m[1]}`);
  }

  const skills = sideItems(sideParts.get('skills') ?? []).map((name): Skill => ({ id: newId(), name: name.slice(0, 80) }));
  const languages = sideItems(sideParts.get('languages') ?? []).map((t): LanguageItem => {
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(t);
    const hit = LANGUAGE_LEVELS.find(([re]) => re.test(m?.[2] ?? ''));
    return { id: newId(), name: (m?.[1] ?? t).slice(0, 60), level: hit?.[1] ?? '', value: hit?.[2] };
  });
  const certifications = sideItems(sideParts.get('certifications') ?? []).map((name): CertItem => ({ id: newId(), name: name.slice(0, 160) }));

  return {
    fullName: cut(head[nameIdx]?.text.trim(), 120), headline: cut(headline, 160), location: cut(location, 120), email, phone, websites,
    profile: linesToRich(parts.get('summary') ?? []),
    experience: experience(parts.get('experience') ?? [], body, flag),
    education: education(parts.get('education') ?? [], body, flag),
    certifications, skills, languages, projects: [], approxDates: flag.approx,
  };
}

/** Estrae le righe del PDF con pdf.js (nel browser) e le divide tra colonna laterale e principale. */
export async function readLinkedInPdf(buf: ArrayBuffer): Promise<LinkedInImport> {
  const { openPdf } = await import('@/lib/pdfjs');
  const doc = await openPdf(buf);
  try {
    type Item = { str: string; x: number; y: number; w: number; size: number; font: string; page: number };
    const items: Item[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      for (const it of content.items) {
        if (!('str' in it) || !it.str.trim()) continue;
        const [a, b, , , x, y] = it.transform as number[];
        items.push({ str: it.str, x: x!, y: y!, w: it.width, size: Math.round(Math.hypot(a!, b!) * 10) / 10 || it.height, font: it.fontName, page: p });
      }
    }
    if (!items.length) throw new Error('empty');
    // la colonna principale inizia dove inizia il nome (il testo più grande della prima pagina)
    const first = items.filter((i) => i.page === 1);
    const name = first.reduce((m, i) => (i.size > m.size ? i : m), first[0] ?? items[0]!);
    const mainX = name.x - 4;
    const lines = (col: Item[]): PdfLine[] => {
      const sorted = [...col].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
      const out: Array<PdfLine & { end: number; long: number }> = [];
      for (const it of sorted) {
        const l = out[out.length - 1];
        if (l && l.page === it.page && Math.abs(l.y - it.y) < Math.max(l.size, it.size) * 0.5) {
          const space = it.x - l.end > it.size * 0.15 && !l.text.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '';
          l.text += space + it.str; l.end = it.x + it.w; l.size = Math.max(l.size, it.size);
          if (it.str.length > l.long) { l.font = it.font; l.long = it.str.length; }
        } else out.push({ text: it.str, size: it.size, font: it.font, x: it.x, y: it.y, page: it.page, end: it.x + it.w, long: it.str.length });
      }
      return out.map(({ end: _e, long: _l, ...l }) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() }));
    };
    return parseLinkedInPdf(lines(items.filter((i) => i.x >= mainX)), lines(items.filter((i) => i.x < mainX)));
  } finally {
    void doc.loadingTask.destroy();
  }
}
