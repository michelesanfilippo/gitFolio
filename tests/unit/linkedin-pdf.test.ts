// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { joinLine, linesToRich, parseLinkedInPdf, type PdfLine } from '@/importers/linkedin/pdf';

// Righe come le estrae pdf.js dal PDF "Save to PDF" di LinkedIn (dati fittizi). Stili: B = grassetto, R = normale.
type Spec = [string, number?, string?, number?];
function col(specs: Spec[], x: number): PdfLine[] {
  let y = 760, page = 1;
  return specs.map(([text, size = 10.5, font = 'R', gap = 0]) => {
    if (text === '<page>') { page++; y = 760; return null; }
    y -= size * 1.35 + gap;
    return { text, size, font, x, y, page };
  }).filter((l): l is PdfLine => l !== null);
}

const side = (head: Record<string, string>) => col([
  [head.contact!, 13, 'B'], ['ada@example.com'], ['+39 333 1234567 (Mobile)'], ['www.linkedin.com/in/ada-'], ['example-1234 (LinkedIn)'], ['ada.example.com (Portfolio)'],
  [head.skills!, 13, 'B', 8], ['TypeScript'], ['Kubernetes'], ['PostgreSQL'],
  [head.languages!, 13, 'B', 8], ['Italian (Native or Bilingual)'], ['English (Full Professional'], ['Proficiency)'],
  [head.certs!, 13, 'B', 8], ['Cloud Architect Professional'], ['Kubernetes Administrator'],
], 30);

const main = (head: Record<string, string>, present: string) => col([
  ['Ada Example', 26, 'B'], ['Staff Engineer, Platform | Open source', 12], ['contributor', 12], ['Milan, Lombardy, Italy', 10.5],
  [head.summary!, 15.75, 'B', 10], ['I build reliable systems for teams that ship fast. Lorem ipsum dolor sit amet,'], ['consectetur adipiscing elit.'],
  ['Open source contributor.', 10.5, 'R', 9],
  [head.experience!, 15.75, 'B', 10],
  ['Acme Corp', 12, 'B'], ['4 years 2 months'], ['Staff Engineer', 11.5, 'B'], [`March 2021 - ${present} (3 years 8 months)`], ['Milan, Italy'],
  ['Leading the platform team.'], ['• Cut build time by 60% across all'], ['repositories'], ['• Mentored 5 engineers'],
  ['Senior Engineer', 11.5, 'B', 6], ['September 2020 - March 2021 (7 months)'],
  ['<page>'], ['Page 1 of 2'],
  ['Globex', 12, 'B', 6], ['Software Engineer', 11.5, 'B'], ['2017 - 2020 (3 years)'], ['Turin Area, Italy'], ['Built things.'],
  [head.education!, 15.75, 'B', 10],
  ['Politecnico Example', 12, 'B'], ["Master's degree, Computer Engineering · (2012 - 2017)"],
  ['Liceo Example', 12, 'B', 6], ['Diploma · (September 2007 - July 2012)'],
], 220);

const EN = { contact: 'Contact', skills: 'Top Skills', languages: 'Languages', certs: 'Certifications', summary: 'Summary', experience: 'Experience', education: 'Education' };
const IT = { contact: 'Contatti', skills: 'Competenze principali', languages: 'Lingue', certs: 'Certificazioni', summary: 'Riepilogo', experience: 'Esperienza', education: 'Formazione' };

describe('LinkedIn profile PDF', () => {
  const check = (head: typeof EN, present: string) => {
    const d = parseLinkedInPdf(main(head, present), side(head));
    expect(d.fullName).toBe('Ada Example');
    expect(d.headline).toBe('Staff Engineer, Platform | Open source contributor');
    expect(d.location).toBe('Milan, Lombardy, Italy');
    expect(d.email).toBe('ada@example.com');
    expect(d.phone).toBe('+39 333 1234567');
    expect(d.websites).toEqual(['https://www.linkedin.com/in/ada-example-1234', 'https://ada.example.com']);
    expect(d.profile).toEqual([
      { type: 'p', content: [{ text: 'I build reliable systems for teams that ship fast. Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }] },
      { type: 'p', content: [{ text: 'Open source contributor.' }] },
    ]);
    expect(d.experience.map((e) => [e.role, e.company, e.location, e.dates])).toEqual([
      ['Staff Engineer', 'Acme Corp', 'Milan, Italy', { start: '2021-03', current: true }],
      ['Senior Engineer', 'Acme Corp', undefined, { start: '2020-09', end: '2021-03' }],
      ['Software Engineer', 'Globex', 'Turin Area, Italy', { start: '2017-01', end: '2020-12' }],
    ]);
    expect(d.experience[0]!.description).toEqual([
      { type: 'p', content: [{ text: 'Leading the platform team.' }] },
      { type: 'ul', items: [[{ text: 'Cut build time by 60% across all repositories' }], [{ text: 'Mentored 5 engineers' }]] },
    ]);
    expect(d.experience[1]!.description).toBeUndefined();
    expect(d.education.map((e) => [e.degree, e.school, e.dates])).toEqual([
      ["Master's degree, Computer Engineering", 'Politecnico Example', { start: '2012-01', end: '2017-12' }],
      ['Diploma', 'Liceo Example', { start: '2007-09', end: '2012-07' }],
    ]);
    expect(d.skills.map((s) => s.name)).toEqual(['TypeScript', 'Kubernetes', 'PostgreSQL']);
    expect(d.languages.map((l) => [l.name, l.level, l.value])).toEqual([['Italian', 'Native', 5], ['English', 'Fluent', 4]]);
    expect(d.certifications.map((c) => c.name)).toEqual(['Cloud Architect Professional', 'Kubernetes Administrator']);
    expect(d.approxDates).toBe(true);
  };

  it('reads an English profile PDF', () => check(EN, 'Present'));
  it('reads an Italian profile PDF (headings and "Presente")', () => check(IT, 'Presente'));

  it('reads Italian month names', () => {
    const d = parseLinkedInPdf(col([['Ada', 26, 'B'], ['Esperienza', 15.75, 'B'], ['Acme', 12, 'B'], ['Ruolo', 11.5, 'B'], ['gennaio 2019 - dicembre 2020 (2 anni)'], ['Testo.']], 220), []);
    expect(d.experience[0]!.dates).toEqual({ start: '2019-01', end: '2020-12' });
  });

  it('rejoins words split across lines, keeps real hyphens', () => {
    expect(joinLine('speaker at engi-', 'neering')).toBe('speaker at engineering');
    expect(joinLine('state of the', 'art')).toBe('state of the art');
    expect(joinLine('Front-', 'End')).toBe('Front- End');
  });

  it('joins wrapped lines and splits paragraphs on larger gaps', () => {
    const l = (text: string, y: number): PdfLine => ({ text, y, size: 10, font: 'R', x: 0, page: 1 });
    expect(linesToRich([l('one', 100), l('two', 86), l('three', 50)])).toEqual([
      { type: 'p', content: [{ text: 'one two' }] }, { type: 'p', content: [{ text: 'three' }] },
    ]);
  });
});
