'use client';

import { Check, Copy, FilePlus2, Link2Off, Share2, Sparkles, Trash2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { withBasePath } from '@/config/brand';
import { MAX_TEMPLATES } from '@/core/saved/saved-cv';
import { useAuth } from '@/features/auth/auth-context';
import { PhotoField } from '@/features/photo/photo-field';
import { deleteTemplate, listTemplates, shareTemplate, unshareTemplate, type TemplateRow } from '@/lib/templates-api';

const fmtDate = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

function Centered({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">{children}</div>;
}

/** Scheletro della pagina mentre si attende la sessione o l'elenco dei template. */
function CardSkeletons({ n = 3 }: { n?: number }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface" style={{ animationDelay: `${i * 120}ms` }}>
          <div className="skeleton aspect-[1/1.414] rounded-none" />
          <div className="flex flex-col gap-2 p-4"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/2" /></div>
        </li>
      ))}
    </ul>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[320px_1fr]" aria-busy="true" aria-label="Loading your dashboard">
      <aside className="flex h-fit flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-3"><div className="skeleton size-14 rounded-full" /><div className="flex flex-1 flex-col gap-2"><div className="skeleton h-4 w-1/2" /><div className="skeleton h-3 w-3/4" /></div></div>
        <div className="skeleton h-10 w-full" /><div className="skeleton h-8 w-1/3" />
      </aside>
      <section><div className="mb-5 flex flex-col gap-2"><div className="skeleton h-7 w-48" /><div className="skeleton h-4 w-72" /></div><CardSkeletons /></section>
    </div>
  );
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
  const [sharing, setSharing] = useState<{ row: TemplateRow; url?: string; copied?: boolean; busy?: boolean; error?: string }>();

  const load = useCallback(async () => {
    try { setItems(await listTemplates()); setError(undefined); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => { if (status === 'in') void load(); }, [status, load]);
  useEffect(() => { setUsername(profile?.username ?? ''); setPhoto(profile?.default_photo ?? undefined); }, [profile]);

  if (status === 'loading') return <PageSkeleton />;
  if (status === 'disabled') return <Centered><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-muted">Accounts are not enabled on this site yet.</p></Centered>;
  if (status === 'out') {
    return (
      <Centered>
        <UserRound className="size-10 text-accent" aria-hidden />
        <h1 className="text-2xl font-bold">Your dashboard</h1>
        <p className="text-muted">Log in to see and edit your saved templates.</p>
        <Button size="lg" onClick={() => auth.openLogin('login')}>Login</Button>
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

  const shareUrl = (share: string) => `${window.location.origin}${withBasePath(`/${locale}/editor/?share=${share}`)}`;

  async function openShare(row: TemplateRow) {
    setSharing({ row, busy: true });
    try {
      const share = await shareTemplate(row);
      setSharing({ row: { ...row, share_id: share }, url: shareUrl(share) });
      setItems((list) => list?.map((t) => (t.id === row.id ? { ...t, share_id: share } : t)));
    } catch (e) { setSharing({ row, error: e instanceof Error ? e.message : String(e) }); }
  }

  async function copyShare() {
    if (!sharing?.url) return;
    try { await navigator.clipboard.writeText(sharing.url); setSharing({ ...sharing, copied: true }); } catch { /* il campo resta selezionabile a mano */ }
  }

  async function stopSharing() {
    if (!sharing) return;
    setSharing({ ...sharing, busy: true });
    try {
      await unshareTemplate(sharing.row.id);
      setItems((list) => list?.map((t) => (t.id === sharing.row.id ? { ...t, share_id: null } : t)));
      setSharing(undefined);
    } catch (e) { setSharing({ ...sharing, busy: false, error: e instanceof Error ? e.message : String(e) }); }
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
              className="field" />
          </label>
          <Button type="submit" size="sm" className="self-start" disabled={!nameChanged || username.trim().length < 2}>Save username</Button>
        </form>

        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <div>
            <h2 className="text-sm font-semibold">Default photo</h2>
            <p className="mt-0.5 text-xs text-muted">Used automatically in every new CV you start. You can change it inside any CV.</p>
          </div>
          <PhotoField photo={photo} onChange={setPhoto} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!photoChanged || !photo} onClick={() => void saveProfile({ default_photo: photo ?? null }, 'Default photo saved.')}>Save as default</Button>
            {profile?.default_photo ? <Button variant="secondary" size="sm" onClick={() => void saveProfile({ default_photo: null }, 'Default photo removed.')}>Remove default</Button> : null}
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
            <ButtonLink href={editorHref('?new=1')} icon={<FilePlus2 />}>New CV</ButtonLink>
          ) : null}
        </div>
        {error ? <p role="alert" className="mb-4 rounded-md border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">{error}</p> : null}
        {!items && !error ? <CardSkeletons /> : null}
        {items && items.length === 0 ? (
          <div className="pop flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={withBasePath("/brand/logo-mark.png")} alt="" width={64} height={64} className="size-16 opacity-90" />
            <div>
              <h2 className="text-lg font-semibold">No saved templates yet</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">Design a CV in the editor and press <strong className="text-fg">Save template</strong>: it will appear here, ready to reopen or share.</p>
            </div>
            <ButtonLink href={editorHref('?new=1')} size="lg" icon={<Sparkles />}>Create your first CV</ButtonLink>
          </div>
        ) : null}
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items?.map((t) => (
            <li key={t.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-accent hover:shadow-[0_20px_40px_-20px_rgb(0_0_0/.75)] focus-within:border-accent">
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
              {/* azioni visibili al passaggio del mouse o col focus; sempre visibili dove non c'è hover (touch) */}
              <span className="m-3 mt-2 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                <Button variant="ghost" size="sm" onClick={() => void openShare(t)} aria-label={`Share ${t.name}`} icon={<Share2 />}
                  className={`font-medium hover:!bg-accent/10 hover:!text-accent-text ${t.share_id ? 'text-accent-text' : ''}`}>Share</Button>
                <Button variant="danger" size="sm" onClick={() => setToDelete(t)} aria-label={`Delete ${t.name}`} icon={<Trash2 />} className="ml-auto font-medium">Delete</Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={Boolean(sharing)} onClose={() => setSharing(undefined)} title={`Share “${sharing?.row.name ?? ''}”`}>
        <p className="text-sm text-muted">
          Anyone with this link can use the <strong className="text-fg">design</strong> of this template: layout, colors, fonts and style.
          Your name, photo, contacts and the rest of your CV are <strong className="text-fg">never shared</strong>. The template name is visible.
        </p>
        {sharing?.error ? <p role="alert" className="mt-4 rounded-md border border-red-400/40 bg-red-400/10 p-2.5 text-xs text-red-300">{sharing.error}</p> : null}
        {sharing?.url ? (
          <div className="mt-4 flex gap-2">
            <input readOnly value={sharing.url} aria-label="Share link" onFocus={(e) => e.currentTarget.select()}
              className="field flex-1 text-xs" />
            <Button onClick={() => void copyShare()} className="shrink-0" icon={sharing.copied ? <Check /> : <Copy />}>{sharing.copied ? 'Copied' : 'Copy link'}</Button>
          </div>
        ) : sharing?.busy ? <p className="mt-4 text-sm text-muted">Creating the link…</p> : null}
        <div className="mt-5 flex items-center justify-between gap-2">
          {sharing?.row.share_id ? (
            <Button variant="danger" disabled={sharing.busy} onClick={() => void stopSharing()} icon={<Link2Off />} className="px-2.5 font-medium">Stop sharing</Button>
          ) : <span />}
          <Button variant="secondary" onClick={() => setSharing(undefined)}>Done</Button>
        </div>
      </Modal>

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(undefined)} title="Delete this template?">
        <p className="text-sm text-muted">“{toDelete?.name}” will be permanently deleted. This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(undefined)}>Cancel</Button>
          <Button variant="danger-solid" onClick={() => void confirmDelete()}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
