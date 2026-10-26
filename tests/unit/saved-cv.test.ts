import { describe, expect, it } from 'vitest';
import { getPalette } from '@/config/palettes';
import { cleanRichText, isPhotoDataUrl, mergeKnown, normalizeSaved } from '@/core/saved/saved-cv';
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
  it('returns null for garbage and fills defaults otherwise', () => {
    expect(normalizeSaved('nope', base())).toBeNull();
    const n = normalizeSaved({ locale: 'xx', design: { colors: { primary: '#123456' } }, photo: 'http://x' }, base());
    expect(n?.locale).toBe('en');
    expect(n?.design.colors.primary).toBe('#123456');
    expect(n?.design.colors.accent).toBe('#C6F36B');
    expect(n?.photo).toBeUndefined();
  });
});
