'use client';

import { Check, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from '@/components/ui/modal';
import { MAX_TEMPLATES, type SavedCvData } from '@/core/saved/saved-cv';
import { useAuth } from '@/features/auth/auth-context';
import { createTemplate, deleteTemplate, getTemplate, listTemplates, TemplateLimitError, updateTemplate, type TemplateRow } from '@/lib/templates-api';

interface Options {
  getSnapshot: () => SavedCvData;
  getThumbnail: () => string | undefined;
  /** Applica un documento letto dal database allo stato dell'editor. */
  load: (data: unknown, name: string) => void;
  canSave: boolean;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Salvataggio/ripresa dei CV dell'utente loggato (max 5). Restituisce i pezzi di UI da montare nell'editor:
 * pulsante "Save template", messaggi di stato, finestre di dialogo (nome, limite raggiunto).
 */
export function useCloudTemplates({ getSnapshot, getThumbnail, load, canSave }: Options) {
  const auth = useAuth();
  const { status } = auth;
  const [meta, setMeta] = useState<{ id: string; name: string } | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string }>();
  const [busy, setBusy] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('My CV');
  const [full, setFull] = useState<TemplateRow[] | null>(null);
  const [armed, setArmed] = useState<string>();
  const wantedId = useRef<string | null>(null);
  const loadedFor = useRef<string | null>(null);
  const [hasParam, setHasParam] = useState(false);

  useEffect(() => {
    wantedId.current = new URLSearchParams(window.location.search).get('t');
    setHasParam(Boolean(wantedId.current));
  }, []);

  // Riprende un CV salvato (?t=<id>) appena l'utente è loggato.
  useEffect(() => {
    const id = wantedId.current;
    if (!id || status !== 'in' || loadedFor.current === id) return;
    loadedFor.current = id;
    setBusy(true);
    getTemplate(id)
      .then((row) => { load(row.data, row.name); setMeta({ id: row.id, name: row.name }); })
      .catch((e) => setNotice({ kind: 'error', text: `Could not open this template: ${errText(e)}` }))
      .finally(() => setBusy(false));
  }, [status, load]);

  const flash = useCallback((text: string) => {
    setNotice({ kind: 'ok', text });
    window.setTimeout(() => setNotice((n) => (n?.text === text ? undefined : n)), 3500);
  }, []);

  const remember = (id: string) => {
    window.history.replaceState(null, '', `${window.location.pathname}?t=${id}`);
    wantedId.current = id;
    loadedFor.current = id;
  };

  async function create(name: string) {
    setBusy(true);
    try {
      const row = await createTemplate(name, getSnapshot(), getThumbnail());
      setMeta({ id: row.id, name: row.name });
      remember(row.id);
      setNameOpen(false);
      flash(`Saved “${row.name}” to your dashboard.`);
    } catch (e) {
      if (e instanceof TemplateLimitError) { setNameOpen(false); setFull(await listTemplates().catch(() => [])); }
      else setNotice({ kind: 'error', text: errText(e) });
    } finally { setBusy(false); }
  }

  async function save() {
    if (!canSave || busy) return;
    setNotice(undefined);
    if (meta) {
      setBusy(true);
      try {
        await updateTemplate(meta.id, { data: getSnapshot(), thumbnail: getThumbnail() });
        flash(`Saved “${meta.name}”.`);
      } catch (e) { setNotice({ kind: 'error', text: errText(e) }); } finally { setBusy(false); }
      return;
    }
    try {
      const list = await listTemplates();
      if (list.length >= MAX_TEMPLATES) return setFull(list);
      setNameDraft(`My CV ${list.length + 1}`);
      setNameOpen(true);
    } catch (e) { setNotice({ kind: 'error', text: errText(e) }); }
  }

  async function removeFromFull(id: string) {
    if (armed !== id) return setArmed(id); // primo clic: arma; secondo: conferma
    setBusy(true);
    try {
      await deleteTemplate(id);
      const left = (full ?? []).filter((t) => t.id !== id);
      setArmed(undefined);
      if (left.length < MAX_TEMPLATES) { setFull(null); setNameDraft(`My CV ${left.length + 1}`); setNameOpen(true); } else setFull(left);
    } catch (e) { setNotice({ kind: 'error', text: errText(e) }); } finally { setBusy(false); }
  }

  const onSubmitName = (e: FormEvent) => { e.preventDefault(); if (nameDraft.trim()) void create(nameDraft.trim()); };

  const saveButton: ReactNode = status === 'in' ? (
    <button type="button" onClick={() => void save()} disabled={!canSave || busy}
      className="flex items-center gap-2 rounded-lg border border-accent/60 px-4 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-50">
      {notice?.kind === 'ok' ? <Check className="size-4" aria-hidden /> : <Save className="size-4" aria-hidden />} Save template
    </button>
  ) : null;

  const message: ReactNode = (
    <>
      {notice ? <span role={notice.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${notice.kind === 'error' ? 'text-red-400' : 'text-accent-text'}`}>{notice.text}</span> : null}
      {hasParam && status === 'out' ? (
        <span role="status" className="text-sm text-muted">
          Log in to open your saved template.{' '}
          <button type="button" onClick={() => auth.openLogin('login')} className="font-semibold text-accent-text underline-offset-4 hover:underline">Login</button>
        </span>
      ) : null}
    </>
  );

  const dialogs: ReactNode = (
    <>
      <Modal open={nameOpen} onClose={() => setNameOpen(false)} title="Save template">
        <form onSubmit={onSubmitName} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs text-muted">Name
            <input autoFocus required maxLength={80} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-fg" />
          </label>
          <p className="text-xs text-muted">Saved to your account. You can keep up to {MAX_TEMPLATES} templates and reopen them from the Dashboard.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNameOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-border">Cancel</button>
            <button type="submit" disabled={busy || !nameDraft.trim()} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50">Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={full !== null} onClose={() => { setFull(null); setArmed(undefined); }} title={`You have ${MAX_TEMPLATES} saved templates`}>
        <p className="mb-4 text-sm text-muted">That is the limit. Delete one to make room for this CV (the other four stay untouched).</p>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {full?.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0 truncate text-sm">{t.name}</span>
              <button type="button" disabled={busy} onClick={() => void removeFromFull(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${armed === t.id ? 'bg-red-500 font-semibold text-white' : 'text-muted hover:bg-red-400/10 hover:text-red-300'}`}>
                <Trash2 className="size-3.5" aria-hidden /> {armed === t.id ? 'Click again to delete' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );

  return { saveButton, message, dialogs, meta, loading: busy && hasParam && !meta };
}
