import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findRange, parseMonth } from '@/importers/dates';
import { docxXmlToLines } from '@/importers/docx';
import { parseCvText, textToLines } from '@/importers/text-cv';
import { sampleCv } from '@/core/schema/sample';

const fixture = readFileSync('tests/fixtures/cv-sample-en.txt', 'utf8');

describe('dates in CVs', () => {
  it('reads months in several formats', () => {
    expect(parseMonth('Jan 2020')).toBe('2020-01');
    expect(parseMonth('marzo 2021')).toBe('2021-03');
    expect(parseMonth('03/2016')).toBe('2016-03');
    expect(parseMonth('2019-07')).toBe('2019-07');
    expect(parseMonth('2015', '12')).toBe('2015-12');
    expect(parseMonth('Sept. 5, 2018')).toBe('2018-09');
    expect(parseMonth('nope')).toBeUndefined();
  });

  it('finds a range in a line and returns the rest', () => {
    expect(findRange('Senior Dev | Jan 2020 – Present')).toEqual({ range: { start: '2020-01', current: true }, rest: 'Senior Dev' });
    expect(findRange('03/2016 - 12/2019')).toEqual({ range: { start: '2016-03', end: '2019-12' }, rest: '' });
    expect(findRange('2013 – 2015')).toEqual({ range: { start: '2013-01', end: '2015-12' }, rest: '' });
    expect(findRange('Designed 40+ screens')).toBeUndefined();
    expect(findRange('Budget 2020-2021 planning')?.range).toEqual({ start: '2020-01', end: '2021-12' });
  });
});

describe('text CV import', () => {
  const { doc, found } = parseCvText(textToLines(fixture), sampleCv('en'));

  it('reads the header and contacts', () => {
    expect(doc.personal.fullName).toBe('Jane Example');
    expect(doc.personal.headline).toBe('Senior Product Designer');
    const by = Object.fromEntries(doc.personal.contacts.map((c) => [c.kind, c.value]));
    expect(by).toMatchObject({ email: 'jane.example@example.com', phone: '+39 333 123 4567', linkedin: 'linkedin.com/in/jane-example', github: 'github.com/janex', website: 'janeexample.dev', location: 'Milan, Italy' });
  });

  it('reads summary, experience and education', () => {
    expect(doc.profile?.[0]).toMatchObject({ type: 'p' });
    expect(doc.experience).toHaveLength(2);
    expect(doc.experience[0]).toMatchObject({ role: 'Senior Product Designer', company: 'Acme Inc', location: 'Milan', dates: { start: '2020-01', current: true } });
    expect(doc.experience[0]!.description).toEqual([{ type: 'ul', items: [[{ text: 'Led the redesign of the onboarding flow, +23% activation.' }], [{ text: 'Built the design system used by 4 product teams.' }]] }]);
    expect(doc.experience[1]).toMatchObject({ role: 'Product Designer', company: 'Globex S.p.A.', dates: { start: '2016-03', end: '2019-12' } });
    expect(doc.experience[1]!.description).toEqual([{ type: 'p', content: [{ text: 'Designed the mobile banking app from scratch.' }] }, { type: 'ul', items: [[{ text: 'Ran 40+ usability sessions.' }]] }]);
    expect(doc.education).toHaveLength(2);
    expect(doc.education[0]).toMatchObject({ degree: 'MSc in Interaction Design', school: 'Politecnico di Milano', dates: { start: '2013-01', end: '2015-12' } });
    expect(doc.education[1]).toMatchObject({ degree: 'BA in Visual Communication', school: 'IUAV University of Venice', dates: { start: '2010-01', end: '2013-12' } });
  });

  it('reads skills, languages, certifications, projects and extra sections', () => {
    expect(doc.skills.map((g) => g.name)).toEqual(['Design', 'Research']);
    expect(doc.skills[0]!.skills.map((s) => s.name)).toEqual(['Figma', 'Sketch', 'Prototyping', 'Design systems']);
    expect(doc.languages).toMatchObject([{ name: 'Italian', level: 'native', value: 5 }, { name: 'English', level: 'C1', value: 4 }, { name: 'Spanish', level: 'B1', value: 3 }]);
    expect(doc.certifications).toMatchObject([{ name: 'Google UX Design Certificate', issuer: 'Coursera', date: '2021-01' }, { name: 'Nielsen Norman Group UX Certification', date: '2019-01' }]);
    expect(doc.projects[0]).toMatchObject({ name: 'Budget Buddy', role: 'side project' });
    expect(doc.custom).toHaveLength(1);
    expect(doc.custom[0]!.title).toBe('INTERESTS');
    expect(doc.locale).toBe('en');
    expect(found).toEqual(expect.arrayContaining(['name', 'contacts', 'summary', 'experience', 'education', 'skills', 'languages', 'certifications', 'projects']));
  });

  it('does not keep placeholder content for sections the file lacks', () => {
    const r = parseCvText(textToLines('Mario Rossi\nmario@example.com\n\nEsperienza\nSviluppatore – Rossi Srl\n2019 – 2021\nCose fatte.'), sampleCv('en'));
    expect(r.doc.education).toEqual([]);
    expect(r.doc.skills).toEqual([]);
    expect(r.doc.locale).toBe('it');
    expect(r.doc.experience[0]).toMatchObject({ role: 'Sviluppatore', company: 'Rossi Srl' });
  });
});

describe('docx paragraphs', () => {
  it('extracts text, bold, bullets and breaks from document.xml', () => {
    const xml = `<w:document><w:body>
      <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Jane</w:t></w:r><w:r><w:t xml:space="preserve"> Example</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Experience</w:t></w:r></w:p>
      <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>Did a &amp; b</w:t></w:r></w:p>
      <w:p><w:r><w:t>line one</w:t><w:br/><w:t>line two</w:t></w:r></w:p>
    </w:body></w:document>`;
    expect(docxXmlToLines(xml)).toEqual([
      { text: 'Jane Example', bold: true, size: 14, bullet: undefined },
      { text: 'Experience', bold: true, size: undefined, bullet: undefined },
      { text: 'Did a & b', bold: false, size: undefined, bullet: true },
      { text: 'line one', bold: false, size: undefined, bullet: undefined },
      { text: 'line two', bold: false, size: undefined, bullet: undefined },
    ]);
  });
});
