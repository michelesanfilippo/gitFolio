import { describe, expect, it } from 'vitest';
import { applyLinkedIn } from '@/importers/linkedin';
import { sampleCv } from '@/core/schema/sample';

describe('LinkedIn import', () => {
  it('sets name, email and photo and leaves the rest of the CV alone', () => {
    const doc = sampleCv('en');
    const out = applyLinkedIn(doc, { name: 'Ada Example', email: 'ada@example.com', photo: 'data:image/jpeg;base64,xx' });
    expect(out.personal.fullName).toBe('Ada Example');
    expect(out.personal.photo).toBe('data:image/jpeg;base64,xx');
    expect(out.personal.contacts.filter((c) => c.kind === 'email').map((c) => c.value)).toEqual(['ada@example.com']);
    expect(out.personal.contacts).toHaveLength(doc.personal.contacts.length);
    expect(out.personal.headline).toBe(doc.personal.headline);
    expect(out.experience).toBe(doc.experience);
  });

  it('adds an email contact when there is none and keeps fields LinkedIn did not send', () => {
    const doc = { ...sampleCv('en'), personal: { ...sampleCv('en').personal, contacts: [], photo: 'data:old' } };
    const out = applyLinkedIn(doc, { email: 'ada@example.com' });
    expect(out.personal.contacts).toMatchObject([{ kind: 'email', value: 'ada@example.com', visible: true }]);
    expect(out.personal.fullName).toBe(doc.personal.fullName);
    expect(out.personal.photo).toBe('data:old');
  });
});
