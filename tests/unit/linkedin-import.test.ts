// @vitest-environment node
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '@/importers/linkedin/csv';
import { applyLinkedIn, availableSections, isLinkedInFile, linkedInMonth, linkedInToCv, textToRich } from '@/importers/linkedin/map';
import { readZip } from '@/importers/linkedin/zip';
import { sampleCv } from '@/core/schema/sample';

// Dati fittizi nello stesso formato dell'export di LinkedIn.
const files = {
  'Profile.csv': 'First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers\n'
    + 'Lorem,Ipsum,,,,"Senior Dolor, Sit Amet","First line.\n\nSecond paragraph.",Software,,"Lorem City, Country",,"[PORTFOLIO:https://example.com/lorem,OTHER:https://github.com/lorem]",\n',
  'Positions.csv': 'Company Name,Title,Description,Location,Started On,Finished On\n'
    + 'Dolor Inc,Lead Role,"Did things.\n- Shipped ""X""\n- Grew Y",Remote,Mar 2021,\n'
    + 'Sit Ltd,Junior Role,,Lorem City,2018,Feb 2021\n',
  'Education.csv': 'School Name,Start Date,End Date,Notes,Degree Name,Activities\nDolor University,2014,2017,,MSc Lorem,Chess club\n',
  'Certifications.csv': 'Name,Url,Authority,Started On,Finished On,License Number\nCert One,https://example.com/c,Ipsum Org,Jun 2022,,\n',
  'Skills.csv': 'Name\nTypeScript\nReact\n',
  'Languages.csv': 'Name,Proficiency\nItalian,Native or bilingual proficiency\nEnglish,Full professional proficiency\n',
  'Email Addresses.csv': 'Email Address,Confirmed,Primary,Updated On\nold@example.com,Yes,No,\nlorem@example.com,Yes,Yes,\n',
  'PhoneNumbers.csv': 'Extension,Number,Type\n,+00 111 222,Mobile\n',
};

function zip(entries: Record<string, string>): ArrayBuffer {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [], centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const n = enc.encode(`Basic_LinkedInDataExport/${name}`), data = deflateRawSync(enc.encode(text));
    const l = new DataView(new ArrayBuffer(30));
    l.setUint32(0, 0x04034b50, true); l.setUint16(8, 8, true); l.setUint32(18, data.length, true); l.setUint16(26, n.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(10, 8, true); c.setUint32(20, data.length, true); c.setUint16(28, n.length, true); c.setUint32(42, offset, true);
    locals.push(new Uint8Array(l.buffer), n, data);
    centrals.push(new Uint8Array(c.buffer), n);
    offset += 30 + n.length + data.length;
  }
  const cdSize = centrals.reduce((s, b) => s + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(10, Object.keys(entries).length, true); e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  const all = [...locals, ...centrals, new Uint8Array(e.buffer)];
  const out = new Uint8Array(all.reduce((s, b) => s + b.length, 0));
  let p = 0; for (const b of all) { out.set(b, p); p += b.length; }
  return out.buffer;
}

describe('LinkedIn import', () => {
  it('parses quoted CSV fields with commas, newlines and escaped quotes', () => {
    expect(parseCsv('a,b\n"x, y","line1\nline2 ""q"""\n')).toEqual([['a', 'b'], ['x, y', 'line1\nline2 "q"']]);
  });

  it('converts LinkedIn dates to YYYY-MM and flags year-only ones', () => {
    const f = { approx: false };
    expect(linkedInMonth('Mar 2021', '01', f)).toBe('2021-03');
    expect(linkedInMonth('September 2019', '01', f)).toBe('2019-09');
    expect(linkedInMonth('Jan 05, 2020', '01', f)).toBe('2020-01');
    expect(f.approx).toBe(false);
    expect(linkedInMonth('2017', '12', f)).toBe('2017-12');
    expect(f.approx).toBe(true);
    expect(linkedInMonth('', '01')).toBeUndefined();
  });

  it('turns bullet lines into lists and the rest into paragraphs', () => {
    expect(textToRich('Intro\n- one\n• two\n\nOutro')).toEqual([
      { type: 'p', content: [{ text: 'Intro' }] },
      { type: 'ul', items: [[{ text: 'one' }], [{ text: 'two' }]] },
      { type: 'p', content: [{ text: 'Outro' }] },
    ]);
    expect(textToRich('  ')).toBeUndefined();
  });

  it('maps the export to CV content', () => {
    const d = linkedInToCv(files);
    expect(d.fullName).toBe('Lorem Ipsum');
    expect(d.headline).toBe('Senior Dolor, Sit Amet');
    expect(d.email).toBe('lorem@example.com');
    expect(d.phone).toBe('+00 111 222');
    expect(d.websites).toEqual(['https://example.com/lorem', 'https://github.com/lorem']);
    expect(d.profile).toHaveLength(2);
    expect(d.experience[0]).toMatchObject({ role: 'Lead Role', company: 'Dolor Inc', location: 'Remote', dates: { start: '2021-03', current: true } });
    expect(d.experience[0]!.description?.[1]).toEqual({ type: 'ul', items: [[{ text: 'Shipped "X"' }], [{ text: 'Grew Y' }]] });
    expect(d.experience[1]!.dates).toEqual({ start: '2018-01', end: '2021-02' });
    expect(d.education[0]).toMatchObject({ degree: 'MSc Lorem', school: 'Dolor University', dates: { start: '2014-01', end: '2017-12' } });
    expect(d.certifications[0]).toMatchObject({ name: 'Cert One', issuer: 'Ipsum Org', date: '2022-06', url: 'https://example.com/c' });
    expect(d.skills.map((s) => s.name)).toEqual(['TypeScript', 'React']);
    expect(d.languages.map((l) => [l.name, l.level, l.value])).toEqual([['Italian', 'Native', 5], ['English', 'Fluent', 4]]);
    expect(d.approxDates).toBe(true);
    expect(availableSections(d)).toEqual(['personal', 'profile', 'experience', 'education', 'certifications', 'skills', 'languages']);
  });

  it('applies only the chosen sections and keeps the rest of the document', () => {
    const doc = sampleCv('en');
    const d = linkedInToCv(files);
    const out = applyLinkedIn(doc, d, new Set(['personal', 'experience']));
    expect(out.personal.fullName).toBe('Lorem Ipsum');
    expect(out.personal.contacts.find((c) => c.kind === 'email')?.value).toBe('lorem@example.com');
    expect(out.personal.contacts.find((c) => c.kind === 'github')?.value).toBe('github.com/lorem');
    expect(out.personal.contacts.some((c) => c.value === 'linkedin.com/in/your-name')).toBe(false); // segnaposto rimosso
    const own = { ...doc, personal: { ...doc.personal, contacts: [{ id: 'x', kind: 'linkedin' as const, value: 'linkedin.com/in/real', visible: true }] } };
    expect(applyLinkedIn(own, d, new Set(['personal'])).personal.contacts.some((c) => c.value === 'linkedin.com/in/real')).toBe(true); // dati reali intatti
    expect(out.experience).toHaveLength(2);
    expect(out.education).toBe(doc.education);
    expect(out.skills).toBe(doc.skills);
    expect(out.personal.photo).toBe(doc.personal.photo);
  });

  it('reads the needed CSV files from a deflated zip inside a folder', async () => {
    const got = await readZip(zip({ ...files, 'Connections.csv': 'x' }), isLinkedInFile);
    expect([...got.keys()].sort()).toEqual(Object.keys(files).sort());
    expect(new TextDecoder().decode(got.get('Skills.csv'))).toBe(files['Skills.csv']);
  });

  it('rejects files that are not zips', async () => {
    await expect(readZip(new TextEncoder().encode('not a zip at all, sorry').buffer as ArrayBuffer, () => true)).rejects.toThrow();
  });
});
