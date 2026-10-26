import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPalette } from '@/config/palettes';
import { clearDraft, loadDraft, saveDraft } from '@/lib/local-draft';
import { defaultDesign } from '@/core/schema/design';
import { sampleCv } from '@/core/schema/sample';

const base = () => { const { id, label: _l, ...c } = getPalette('gitfolio'); return defaultDesign(c, id); };
const snap = (name: string) => ({ v: 2 as const, content: { ...sampleCv(), personal: { ...sampleCv().personal, fullName: name } }, design: base() });

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('local draft', () => {
  it('returns null when nothing is stored', () => expect(loadDraft(base())).toBeNull());

  it('saves and restores a document', () => {
    expect(saveDraft(snap('Ada'))).toBe(true);
    expect(loadDraft(base())?.content.personal.fullName).toBe('Ada');
  });

  it('keeps two slots and always loads the newest', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000).mockReturnValueOnce(3000);
    saveDraft(snap('first'));
    saveDraft(snap('second'));
    saveDraft(snap('third')); // sovrascrive il più vecchio ("first")
    expect(loadDraft(base())?.content.personal.fullName).toBe('third');
    expect(localStorage.getItem('gitfolio:draft:a')).toContain('third');
    expect(localStorage.getItem('gitfolio:draft:b')).toContain('second');
  });

  it('a corrupted slot never destroys the last valid copy', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000);
    saveDraft(snap('valid')); // slot a
    localStorage.setItem('gitfolio:draft:b', '{not json');
    expect(loadDraft(base())?.content.personal.fullName).toBe('valid');
    saveDraft(snap('newer')); // deve usare lo slot rovinato (b), non quello valido (a)
    expect(localStorage.getItem('gitfolio:draft:a')).toContain('valid');
    expect(loadDraft(base())?.content.personal.fullName).toBe('newer');
  });

  it('sanitises restored content (hostile data in storage)', () => {
    localStorage.setItem('gitfolio:draft:a', JSON.stringify({ savedAt: 1, data: { v: 2, content: { personal: { fullName: 'x', photo: 'javascript:alert(1)', contacts: [] } }, design: base() } }));
    const d = loadDraft(base());
    expect(d?.content.personal.photo).toBeUndefined();
  });

  it('survives a full or blocked storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    expect(saveDraft(snap('x'))).toBe(false);
  });

  it('clears both slots', () => {
    saveDraft(snap('a')); saveDraft(snap('b'));
    clearDraft();
    expect(loadDraft(base())).toBeNull();
  });
});
