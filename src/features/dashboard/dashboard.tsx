'use client';

import { FilePlus2, Trash2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/modal';
import { withBasePath } from '@/config/brand';
import { MAX_TEMPLATES } from '@/core/saved/saved-cv';
import { useAuth } from '@/features/auth/auth-context';
import { PhotoField } from '@/features/photo/photo-field';
import { deleteTemplate, listTemplates, type TemplateRow } from '@/lib/templates-api';

const fmtDate = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

function Centered({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">{children}</div>;
}

export function Dashboard({ locale }: { locale: string }) {
  const auth = useAuth();
  const { status, profile } = auth;
  const [items, setItems] = useState<TemplateRow[]>();
  const [error, setError] = useState<string>();
  const [toDelete, setToDelete] = useState<TemplateRow>();
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [msg, setMsg] = useState<string>();

  const load = useCallback(async () => {
    try { setItems(await listTemplates()); setError(undefined); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => { if (status === 'in') void load(); }, [status, load]);
  useEffect(() => { setUsername(profile?.username ?? ''); setPhoto(profile?.default_photo ?? undefined); }, [profile]);

  if (status === 'loading') return <Centered><p className="text-muted">Loading…</p></Centered>;
  if (status === 'disabled') return <Centered><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-muted">Accounts are not enabled on this site yet.</p></Centered>;
  if (status === 'out') {
    return (
      <Centered>
        <UserRound className="size-10 text-accent" aria-hidden />
        <h1 className="text-2xl font-bold">Your dashboard</h1>
        <p className="text-muted">Log in to see and edit your saved templates.</p>
        <button type="button" onClick={() => auth.openLogin('login')} className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg">Login</button>
      </Centered>
    );
  }

  const editorHref = (q = '') => withBasePath(`/${locale}/editor/${q}`);
  const count = items?.length ?? 0;
  const photoChanged = (photo ?? null) !== (profile?.default_photo ?? null);
  const nameChanged = username.trim() !== (profile?.username ?? '');

  async function saveProfile(patch: { username?: string; default_photo?: string | null }, ok: string) {
    setMsg(undefined);
    const err = await auth.updateProfile(patch);
    setMsg(err ?? ok);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try { await deleteTemplate(toDelete.id); setToDelete(undefined); await load(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); setToDelete(undefined); }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[320px_1fr]">
      <aside aria-label="Account" className="flex h-fit flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3">
          {profile?.default_photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.default_photo} alt="" className="size-14 rounded-full border border-border object-cover" />
          ) : (
            <span className="grid size-14 place-items-center rounded-full bg-accent text-xl font-bold text-accent-fg" aria-hidden>{(profile?.username ?? auth.email ?? '?').slice(0, 1).toUpperCase()}</span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile?.username || 'No username yet'}</p>
            <p className="truncate text-sm text-muted">{auth.email}</p>
          </div>
        </div>

        <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void saveProfile({ username: username.trim() }, 'Username saved.'); }}>
          <label className="flex flex-col gap-1.5 text-xs text-muted">Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={2} maxLength={40} required
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg" />
          </label>
          <button type="submit" disabled={!nameChanged || username.trim().length < 2} className="self-start rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40">Save username</button>
        </form>

        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <div>
            <h2 className="text-sm font-semibold">Default photo</h2>
            <p className="mt-0.5 text-xs text-muted">Used automatically in every new CV you start. You can change it inside any CV.</p>
          </div>
          <PhotoField photo={photo} onChange={setPhoto} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!photoChanged || !photo} onClick={() => void saveProfile({ default_photo: photo ?? null }, 'Default photo saved.')} className="rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg disabled:opacity-40">Save as default</button>
            {profile?.default_photo ? <button type="button" onClick={() => void saveProfile({ default_photo: null }, 'Default photo removed.')} className="rounded-md border border-border px-3.5 py-2 text-sm hover:bg-border">Remove default</button> : null}
          </div>
        </div>
        {msg ? <p role="status" className="text-xs text-accent-text">{msg}</p> : null}
      </aside>

      <section aria-label="Your templates">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Your templates</h1>
            <p className="text-sm text-muted">{items ? `${count} of ${MAX_TEMPLATES} saved. Click one to keep working on it.` : 'Loading…'}</p>
          </div>
          {count < MAX_TEMPLATES ? (
            <a href={editorHref('?new=1')} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg"><FilePlus2 className="size-4" aria-hidden /> New CV</a>
          ) : null}
        </div>
        {error ? <p role="alert" className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p> : null}
        {items && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
            <p>No saved templates yet.</p>
            <p className="mt-1 text-sm">Design a CV in the editor and press <strong className="text-fg">Save template</strong>.</p>
          </div>
        ) : null}
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items?.map((t) => (
            <li key={t.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent">
              <a href={editorHref(`?t=${t.id}`)} className="block focus-visible:outline-offset-[-3px]" aria-label={`Open ${t.name}`}>
                <span className="block aspect-[1/1.414] overflow-hidden bg-white">
                  {t.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.thumbnail} alt="" className="size-full object-cover object-top" />
                  ) : null}
                </span>
                <span className="block px-4 pt-3">
                  <span className="block truncate font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted">Edited {fmtDate(t.updated_at)}</span>
                </span>
              </a>
              <button type="button" onClick={() => setToDelete(t)} aria-label={`Delete ${t.name}`}
                className="m-3 ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-red-400/10 hover:text-red-300">
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(undefined)} title="Delete this template?">
        <p className="text-sm text-muted">“{toDelete?.name}” will be permanently deleted. This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setToDelete(undefined)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-border">Cancel</button>
          <button type="button" onClick={() => void confirmDelete()} className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
