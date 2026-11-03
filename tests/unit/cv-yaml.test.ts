import { describe, expect, it } from 'vitest';
import { fromYaml, toYaml } from '@/core/yaml/cv-yaml';
import { sampleCv } from '@/core/schema/sample';

describe('CV ↔ YAML', () => {
  it('round-trips the sample CV (ids kept, photo kept)', () => {
    const doc = { ...sampleCv('en'), personal: { ...sampleCv('en').personal, photo: 'data:image/jpeg;base64,abcd' } };
    const yaml = toYaml(doc);
    expect(yaml).toContain('name: Lorem Ipsum');
    expect(yaml).toContain('end: present');
    expect(yaml).not.toContain('data:image'); // la foto non va nel testo
    const back = fromYaml(yaml, doc);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.doc).toEqual(doc);
  });

  it('reports syntax errors with the line and leaves the document alone', () => {
    const r = fromYaml('name: Ada\nexperience:\n  - role: [unclosed', sampleCv());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/line \d/);
  });

  it('accepts a minimal hand-written document and fills the rest', () => {
    const r = fromYaml(['name: Ada Lovelace', 'contacts:', '  - email: ada@example.com', '  - github: github.com/ada', 'experience:', '  - role: Analyst', '    company: Babbage & Co', '    start: 1843-01', '    end: present',
      '    description: |', '      Wrote the **first** program.', '      - notes on the engine', 'skills:', '  - group: Maths', '    items: [Algebra, { name: Logic, level: 5 }]', 'languages:', '  - name: English', '    level: Native', '    bar: 5'].join('\n'), sampleCv());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.personal.fullName).toBe('Ada Lovelace');
    expect(r.doc.personal.contacts.map((c) => c.kind)).toEqual(['email', 'github']);
    expect(r.doc.experience[0]).toMatchObject({ role: 'Analyst', company: 'Babbage & Co', dates: { start: '1843-01', current: true } });
    expect(r.doc.experience[0]!.description).toEqual([{ type: 'p', content: [{ text: 'Wrote the ' }, { text: 'first', bold: true }, { text: ' program.' }] }, { type: 'ul', items: [[{ text: 'notes on the engine' }]] }]);
    expect(r.doc.skills[0]!.skills).toMatchObject([{ name: 'Algebra' }, { name: 'Logic', level: 5 }]);
    expect(r.doc.languages[0]).toMatchObject({ name: 'English', level: 'Native', value: 5 });
    expect(r.doc.education).toEqual([]); // sezioni assenti nel testo: vuote, non quelle del segnaposto
    expect(r.doc.certifications).toEqual([]);
  });

  it('rejects non-object documents', () => {
    expect(fromYaml('- just\n- a list', sampleCv()).ok).toBe(false);
    expect(fromYaml('', sampleCv()).ok).toBe(false);
  });
});

describe('birth date and icons in YAML', () => {
  it('round-trips a date of birth and a chosen icon', () => {
    const base = sampleCv('en');
    const doc = { ...base, personal: { ...base.personal, contacts: [
      { id: 'c1', kind: 'birthdate' as const, value: '1990-03-12', visible: true, icon: 'gift' },
      { id: 'c2', kind: 'email' as const, value: 'ada@example.com', visible: true, icon: 'at-sign' },
      { id: 'c3', kind: 'phone' as const, value: '+39 333 123 4567', visible: false },
    ] } };
    const yaml = toYaml(doc);
    expect(yaml).toContain('birthdate: 1990-03-12');
    expect(yaml).toContain('icon: gift');
    const back = fromYaml(yaml, doc);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.doc.personal.contacts).toEqual(doc.personal.contacts);
  });

  it('drops an icon that does not belong to the kind, and a malformed date', () => {
    const r = fromYaml(['name: Ada', 'contacts:', '  - email: ada@example.com', '    icon: cake', '  - birthdate: 31/02/1990'].join('\n'), sampleCv());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.personal.contacts[0]!.icon).toBeUndefined();
    expect(r.doc.personal.contacts[1]).toMatchObject({ kind: 'birthdate', value: '' });
  });
});
