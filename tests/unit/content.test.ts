import { describe, expect, it } from 'vitest';
import { contactHref, contactText, visibleContacts } from '@/core/content/contacts';
import { duplicateAt, move, removeAt, update } from '@/core/content/list';
import { effectiveOrder, insertRelative, moveWithinColumn, newCustomSection, sectionTitle, STANDARD_SECTIONS } from '@/core/content/order';
import { labels } from '@/templates/labels';
import { sampleCv } from '@/core/schema/sample';
import type { ContactItem } from '@/core/schema/cv';

const c = (kind: ContactItem['kind'], value: string, visible = true): ContactItem => ({ id: kind + value, kind, value, visible });

describe('contacts', () => {
  it('builds safe hrefs per kind', () => {
    expect(contactHref(c('email', 'a@b.co'))).toBe('mailto:a@b.co');
    expect(contactHref(c('email', 'not-an-email'))).toBeUndefined();
    expect(contactHref(c('phone', '+39 02 1234 5678'))).toBe('tel:+390212345678');
    expect(contactHref(c('phone', '12'))).toBeUndefined();
    expect(contactHref(c('location', 'Milano'))).toBeUndefined();
    expect(contactHref(c('linkedin', 'linkedin.com/in/me'))).toBe('https://linkedin.com/in/me');
    expect(contactHref(c('website', 'javascript:alert(1)'))).toBeUndefined();
    expect(contactHref(c('github', ''))).toBeUndefined();
  });
  it('shows URLs without protocol, www and trailing slash', () => {
    expect(contactText(c('website', 'https://www.example.com/'))).toBe('example.com');
    expect(contactText(c('linkedin', 'linkedin.com/in/me'))).toBe('linkedin.com/in/me');
    expect(contactText(c('email', ' a@b.co '))).toBe('a@b.co');
  });
  it('drops hidden and empty contacts', () => {
    expect(visibleContacts([c('email', 'a@b.co'), c('phone', '', true), c('website', 'x.com', false)]).map((x) => x.kind)).toEqual(['email']);
  });
});

describe('list operations', () => {
  const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('moves within bounds only', () => {
    expect(move(l, 0, 1).map((x) => x.id)).toEqual(['b', 'a', 'c']);
    expect(move(l, 0, -1).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(move(l, 2, 1).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('removes and updates without mutating', () => {
    expect(removeAt(l, 1).map((x) => x.id)).toEqual(['a', 'c']);
    expect(l).toHaveLength(3);
    expect(update([{ id: 'a', n: 1 }], 'a', { n: 2 })).toEqual([{ id: 'a', n: 2 }]);
  });
  it('duplicates after the original with fresh ids at every depth', () => {
    const src = [{ id: 'g1', skills: [{ id: 's1', name: 'x' }] }];
    const out = duplicateAt(src, 0);
    expect(out).toHaveLength(2);
    expect(out[1]!.id).not.toBe('g1');
    expect(out[1]!.skills[0]!.id).not.toBe('s1');
    expect(out[1]!.skills[0]!.name).toBe('x');
  });
});

describe('section order', () => {
  const doc = { custom: [newCustomSection('Hobbies', [])] };
  const cid = doc.custom[0]!.id;
  it('appends missing sections, drops unknown and duplicate ids', () => {
    const o = effectiveOrder(['skills', 'ghost', 'skills', 'profile'], doc);
    expect(o.slice(0, 2)).toEqual(['skills', 'profile']);
    expect(o).not.toContain('ghost');
    expect(new Set(o).size).toBe(o.length);
    expect(o).toContain(cid);
    expect(o).toHaveLength(STANDARD_SECTIONS.length + 1);
  });
  it('moves inside its own column only', () => {
    const order = ['contacts', 'profile', 'experience', 'skills', 'languages'];
    const side = new Set(['contacts', 'skills', 'languages']);
    expect(moveWithinColumn(order, side, 'experience', -1)).toEqual(['contacts', 'experience', 'profile', 'skills', 'languages']);
    expect(moveWithinColumn(order, side, 'skills', -1)).toEqual(['skills', 'profile', 'experience', 'contacts', 'languages']); // salta oltre la colonna principale
    expect(moveWithinColumn(order, side, 'contacts', -1)).toEqual(order); // già primo della colonna laterale
  });
  it('inserts before/after an anchor, or at the end', () => {
    expect(insertRelative(['a', 'b', 'c'], 'x', 'b', 'before')).toEqual(['a', 'x', 'b', 'c']);
    expect(insertRelative(['a', 'b', 'c'], 'x', 'b', 'after')).toEqual(['a', 'b', 'x', 'c']);
    expect(insertRelative(['a', 'b'], 'x', null, 'after')).toEqual(['a', 'b', 'x']);
    expect(insertRelative(['a', 'x', 'b'], 'x', 'a', 'after')).toEqual(['a', 'x', 'b']);
  });
  it('resolves titles: custom override > custom title > language label', () => {
    const d = { custom: doc.custom, sectionTitles: { experience: 'Work history', [cid]: 'My hobbies' } };
    expect(sectionTitle('experience', d, labels.en)).toBe('Work history');
    expect(sectionTitle('education', d, labels.it)).toBe('Formazione');
    expect(sectionTitle(cid, d, labels.en)).toBe('My hobbies');
    expect(sectionTitle(cid, { ...d, sectionTitles: {} }, labels.en)).toBe('Hobbies');
  });
});

describe('sample content for new users', () => {
  it('is lorem ipsum only (no real names, companies or products)', () => {
    const text = JSON.stringify(sampleCv()).toLowerCase();
    for (const real of ['google', 'microsoft', 'amazon', 'linkedin.com/in/michele', 'acme', 'globex']) expect(text).not.toContain(real);
    expect(text).toContain('lorem');
  });
});
