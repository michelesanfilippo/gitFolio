import { describe, expect, it } from 'vitest';
import { contactHref, contactText, contactWarning, formatBirthDate, isValidIsoDate } from '@/core/content/contacts';
import { CONTACT_ICON_CHOICES, CONTACT_KINDS, NO_ICON, contactIconId, contactIconPrims, iconName, iconPrims, validIcon } from '@/core/icons/contact-icons';
import { ICON_PATHS } from '@/core/icons/icon-paths';
import { cleanContent } from '@/core/saved/saved-cv';
import { sampleCv } from '@/core/schema/sample';
import type { ContactItem } from '@/core/schema/cv';

const item = (kind: ContactItem['kind'], value: string, extra: Partial<ContactItem> = {}): ContactItem => ({ id: 'x', kind, value, visible: true, ...extra });

describe('date of birth', () => {
  it('accepts only real, past days', () => {
    expect(isValidIsoDate('1990-03-12')).toBe(true);
    expect(isValidIsoDate('2000-02-29')).toBe(true);
    expect(isValidIsoDate('1999-02-29')).toBe(false); // non esiste
    expect(isValidIsoDate('1990-13-01')).toBe(false);
    expect(isValidIsoDate('1899-12-31')).toBe(false);
    expect(isValidIsoDate('2999-01-01')).toBe(false); // futuro
    expect(isValidIsoDate('12/03/1990')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });

  it('is written out in the language of the CV, without shifting the day', () => {
    expect(formatBirthDate('1990-03-12', 'en')).toBe('March 12, 1990');
    expect(formatBirthDate('1990-03-12', 'it')).toBe('12 marzo 1990');
    expect(formatBirthDate('1990-03-12', 'de')).toBe('12. März 1990');
    expect(formatBirthDate('1990-12-31', 'fr')).toBe('31 décembre 1990');
    expect(formatBirthDate('not a date', 'it')).toBe('not a date');
    expect(contactText(item('birthdate', '1990-03-12'), 'es')).toBe('12 de marzo de 1990');
  });

  it('is never a link, and never warns', () => {
    expect(contactHref(item('birthdate', '1990-03-12'))).toBeUndefined();
    expect(contactWarning(item('birthdate', '1990-03-12'))).toBeUndefined();
  });
});

describe('contact warnings', () => {
  it('explains why a value will not be a clickable link', () => {
    expect(contactWarning(item('email', 'not-an-email'))).toMatch(/email/);
    expect(contactWarning(item('phone', '12'))).toMatch(/digits/);
    expect(contactWarning(item('website', 'a b c'))).toMatch(/web address/);
    expect(contactWarning(item('email', 'a@b.co'))).toBeUndefined();
    expect(contactWarning(item('phone', '+39 333 123 4567'))).toBeUndefined();
    expect(contactWarning(item('email', ''))).toBeUndefined();
    expect(contactWarning(item('location', 'Milan'))).toBeUndefined();
  });
});

describe('contact icons', () => {
  it('offers several icons for every kind, all of them drawable', () => {
    for (const kind of CONTACT_KINDS) {
      const choices = CONTACT_ICON_CHOICES[kind];
      expect(choices.length, kind).toBeGreaterThanOrEqual(5);
      expect(new Set(choices).size, kind).toBe(choices.length);
      for (const id of choices) expect(ICON_PATHS[id]?.length, `${kind}/${id}`).toBeGreaterThan(0);
    }
  });

  it('falls back to the first icon of the kind, and supports "no icon"', () => {
    expect(contactIconId('email')).toBe('mail');
    expect(contactIconId('email', 'at-sign')).toBe('at-sign');
    expect(contactIconId('email', 'cake')).toBe('mail'); // di un altro tipo
    expect(contactIconId('email', 'nope')).toBe('mail');
    expect(contactIconId('phone', NO_ICON)).toBe(NO_ICON);
    expect(contactIconPrims('phone', NO_ICON)).toEqual([]);
    expect(contactIconPrims('phone').length).toBeGreaterThan(0);
    expect(validIcon('github', 'git-branch')).toBe('git-branch');
    expect(validIcon('github', 'mail')).toBeUndefined();
    expect(validIcon('github', 42)).toBeUndefined();
    expect(iconPrims('cake').length).toBeGreaterThan(0);
    expect(iconName('at-sign')).toBe('At sign');
    expect(iconName('globe')).toBe('Globe');
    expect(iconName(NO_ICON)).toBe('No icon');
  });
});

describe('saving and loading contacts', () => {
  const load = (contacts: unknown[]) => cleanContent({ personal: { fullName: 'A', contacts } }, sampleCv('en')).personal.contacts;

  it('keeps a valid birth date and icon, and drops invalid ones', () => {
    const c = load([
      { id: 'a', kind: 'birthdate', value: '1990-03-12', visible: true, icon: 'gift' },
      { id: 'b', kind: 'birthdate', value: '31/02/1990', visible: true, icon: 'mail' },
      { id: 'c', kind: 'email', value: 'a@b.co', visible: true, icon: 'at-sign' },
      { id: 'd', kind: 'email', value: 'a@b.co', visible: true, icon: 'cake' },
      { id: 'e', kind: 'phone', value: '123456', visible: true, icon: NO_ICON },
    ]);
    expect(c[0]).toMatchObject({ kind: 'birthdate', value: '1990-03-12', icon: 'gift' });
    expect(c[1]).toMatchObject({ kind: 'birthdate', value: '' });
    expect(c[1]!.icon).toBeUndefined();
    expect(c[2]!.icon).toBe('at-sign');
    expect(c[3]!.icon).toBeUndefined();
    expect(c[4]!.icon).toBe(NO_ICON);
  });
});
