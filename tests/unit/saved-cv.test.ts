import { describe, expect, it } from 'vitest';
import { getPalette } from '@/config/palettes';
import { cleanRichText, isPhotoDataUrl, mergeKnown, normalizeSaved } from '@/core/saved/saved-cv';
import { newCustomSection } from '@/core/content/order';
import { sampleCv } from '@/core/schema/sample';
import { defaultDesign } from '@/core/schema/design';

const base = () => { const { id, label: _l, ...c } = getPalette('gitfolio'); return defaultDesign(c, id); };

describe('mergeKnown', () => {
  it('keeps defaults for missing keys (old documents)', () => {
    const merged = mergeKnown(base(), { typography: { headingFont: 'lora' } });
    expect(merged.typography.headingFont).toBe('lora');
    expect(merged.typography.bodyFont).toBe('inter');
    expect(merged.pattern.kind).toBe('none');
  });
  it('ignores unknown keys and wrong types', () => {
    const merged = mergeKnown(base(), { page: { columns: 'two', evil: 1 }, hacked: true, photo: { size: '999', borderWidth: 4 } });
    expect(merged.page.columns).toBe(1);
    expect((merged as unknown as Record<string, unknown>).hacked).toBeUndefined();
    expect((merged.page as unknown as Record<string, unknown>).evil).toBeUndefined();
    expect(merged.photo.size).toBe(84);
    expect(merged.photo.borderWidth).toBe(4);
  });
  it('keeps dynamic numeric maps such as sidebar offsets', () => {
    expect(mergeKnown(base(), { page: { sidebarOffsets: { skills: 40, contacts: 'x', languages: Infinity } } }).page.sidebarOffsets).toEqual({ skills: 40 });
  });
  it('replaces arrays only when element types match', () => {
    expect(mergeKnown(base(), { page: { sidebarSections: ['skills'] } }).page.sidebarSections).toEqual(['skills']);
    expect(mergeKnown(base(), { page: { sidebarSections: [1, 2] } }).page.sidebarSections).toEqual(['contacts', 'skills', 'languages', 'certifications']);
  });
});

describe('cleanRichText', () => {
  it('drops unsafe links and malformed blocks', () => {
    const out = cleanRichText([
      { type: 'p', content: [{ text: 'x', link: 'javascript:alert(1)', bold: true }, { text: 5 }, { text: 'ok', link: 'example.com' }] },
      { type: 'script', content: [] },
      'junk',
      { type: 'ul', items: [[{ text: 'a' }], 'bad'] },
    ]);
    expect(out).toEqual([
      { type: 'p', content: [{ text: 'x', bold: true }, { text: 'ok', link: 'https://example.com' }] },
      { type: 'ul', items: [[{ text: 'a' }], []] },
    ]);
  });
  it('returns undefined for non-arrays', () => expect(cleanRichText({})).toBeUndefined());
});

describe('photo data URLs', () => {
  it('accepts only image data URLs', () => {
    expect(isPhotoDataUrl('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(isPhotoDataUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isPhotoDataUrl('javascript:alert(1)')).toBe(false);
    expect(isPhotoDataUrl('https://evil.example/x.jpg')).toBe(false);
  });
});

describe('normalizeSaved', () => {
  it('returns null for garbage', () => expect(normalizeSaved('nope', base())).toBeNull());

  it('reads the legacy v1 format (design + profile + photo)', () => {
    const n = normalizeSaved({ locale: 'xx', design: { colors: { primary: '#123456' } }, photo: 'http://x', profile: [{ type: 'p', content: [{ text: 'hi' }] }] }, base());
    expect(n?.content.locale).toBe('en');
    expect(n?.design.colors.primary).toBe('#123456');
    expect(n?.design.colors.accent).toBe('#C6F36B');
    expect(n?.content.personal.photo).toBeUndefined();
    expect(n?.content.profile).toEqual([{ type: 'p', content: [{ text: 'hi' }] }]);
    expect(n?.content.experience.length).toBeGreaterThan(0); // contenuti mancanti = segnaposto
  });

  it('round-trips a full v2 document', () => {
    const content = { ...sampleCv('it'), custom: [newCustomSection('Hobbies', [{ type: 'p', content: [{ text: 'chess' }] }])], hiddenSections: ['projects'] };
    content.sectionTitles = { experience: 'Work', [content.custom[0]!.id]: 'My hobbies' };
    const n = normalizeSaved(JSON.parse(JSON.stringify({ v: 2, content, design: base() })), base());
    expect(n?.content).toEqual(content);
  });

  it('sanitises hostile or malformed v2 content', () => {
    const n = normalizeSaved({
      v: 2,
      content: {
        locale: 'it',
        personal: { fullName: 'x'.repeat(500), photo: 'javascript:alert(1)', contacts: [{ id: 'a', kind: 'bogus', value: 'v', visible: false }, 'junk', { id: 'a', kind: 'email', value: 'e@x.co' }] },
        experience: [{ id: 'e1', role: 'R', dates: { start: '2020-13', end: '2021-02', current: 'yes' } }, 5],
        skills: [{ id: 'g', name: 'G', skills: [{ id: 's', name: 'S', level: 9 }, { id: 's', name: 'T', level: 3 }] }],
        custom: [{ id: 'evil', title: 'T', body: [{ type: 'p', content: [{ text: 'a', link: 'javascript:x' }] }] }],
        sectionTitles: { experience: 'Work', empty: '   ' },
        hiddenSections: ['profile', 7],
      },
      design: base(),
    }, base());
    const c = n!.content;
    expect(c.personal.fullName).toHaveLength(100);
    expect(c.personal.photo).toBeUndefined();
    expect(c.personal.contacts[0]).toMatchObject({ kind: 'link', visible: false });
    expect(c.personal.contacts).toHaveLength(2);
    expect(new Set(c.personal.contacts.map((x) => x.id)).size).toBe(2); // id duplicati rigenerati
    expect(c.experience).toHaveLength(1);
    expect(c.experience[0]!.dates).toEqual({ end: '2021-02' }); // mese 13 e "current" non booleano scartati
    expect(c.skills[0]!.skills[0]!.level).toBeUndefined();
    expect(new Set(c.skills[0]!.skills.map((x) => x.id)).size).toBe(2);
    expect(c.custom[0]!.id.startsWith('custom-')).toBe(true);
    expect(JSON.stringify(c.custom)).not.toContain('javascript');
    expect(c.sectionTitles).toEqual({ experience: 'Work' });
    expect(c.hiddenSections).toEqual(['profile']);
  });
});
