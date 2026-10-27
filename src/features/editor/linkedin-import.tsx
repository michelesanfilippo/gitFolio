'use client';

import { Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CvDocument } from '@/core/schema/cv';
import { loadPhoto, renderPhoto } from '@/core/photo/process';
import { useAuth, type LinkedInIdentity } from '@/features/auth/auth-context';
import { applyLinkedIn } from '@/importers/linkedin';

// Import da LinkedIn con un click: login LinkedIn (popup) e si importano i dati che LinkedIn espone alle app di terze
// parti, cioè nome, email e foto. Il resto del CV non cambia; l'utente può modificare tutto a mano.

// Se il browser blocca il popup il login avviene con un redirect: al ritorno l'import riparte da qui.
const PENDING_KEY = 'gitfolio:linkedin-import';

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

/** Foto LinkedIn → stesso formato delle foto caricate a mano (JPEG quadrato). Può fallire se il CDN non consente CORS. */
async function photoFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  const src = await loadPhoto(new File([blob], 'linkedin.jpg', { type: blob.type || 'image/jpeg' }));
  try { return renderPhoto(src, 1, 0, 0); } finally { src.bitmap.close(); }
}

export function LinkedInImportButton({ onApply }: { onApply: (update: (doc: CvDocument) => CvDocument) => void }) {
  const auth = useAuth();
  const [busy, setBusy] = useState<'login' | 'import'>();
  const [note, setNote] = useState<{ ok: boolean; text: string }>();
  const abort = useRef<AbortController>(undefined);
  const noteTimer = useRef(0);
  const li = auth.linkedIn;

  const show = useCallback((ok: boolean, text: string) => {
    setNote({ ok, text });
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(undefined), ok ? 6000 : 9000);
  }, []);
  useEffect(() => () => window.clearTimeout(noteTimer.current), []);

  const importFrom = useCallback(async (id: LinkedInIdentity) => {
    sessionStorage.removeItem(PENDING_KEY);
    setBusy('import');
    const photo = id.picture ? await photoFromUrl(id.picture).catch(() => undefined) : undefined;
    onApply((doc) => applyLinkedIn(doc, { name: id.name, email: id.email, photo }));
    setBusy(undefined);
    const got = [id.name && 'name', id.email && 'email', photo && 'photo'].filter(Boolean).join(', ');
    show(true, `Imported from LinkedIn: ${got || 'nothing new'}.${id.picture && !photo ? ' The photo could not be loaded: add it from the Photo tab.' : ''}`);
  }, [onApply, show]);

  // Ritorno dal login: appena l'identità LinkedIn è disponibile si completa l'import (anche dopo un redirect).
  useEffect(() => {
    if (li && sessionStorage.getItem(PENDING_KEY)) void importFrom(li);
  }, [li, importFrom]);

  async function start() {
    setNote(undefined);
    if (auth.status === 'disabled') return show(false, "LinkedIn sign-in isn't enabled on this site yet.");
    if (li) return void importFrom(li);
    setBusy('login');
    sessionStorage.setItem(PENDING_KEY, '1');
    abort.current = new AbortController();
    const err = await auth.signInOAuthPopup('linkedin_oidc', abort.current.signal);
    if (err) {
      sessionStorage.removeItem(PENDING_KEY);
      setBusy(undefined);
      if (err !== 'cancelled') show(false, err);
    }
    // ok: l'import parte dall'effetto sopra quando arriva l'identità LinkedIn
  }

  return (
    <span className="flex items-center gap-3">
      {busy === 'login' ? (
        <span role="status" className="flex items-center gap-1.5 text-xs text-muted">
          Finish signing in in the LinkedIn window…
          <button type="button" onClick={() => abort.current?.abort()} className="underline hover:text-fg">Cancel</button>
        </span>
      ) : note ? (
        <span role={note.ok ? 'status' : 'alert'} className={`flex max-w-xs items-center gap-1.5 text-xs ${note.ok ? 'text-muted' : 'text-red-400'}`}>
          {note.ok ? <Check className="size-3.5 shrink-0 text-accent" aria-hidden /> : null} {note.text}
        </span>
      ) : null}
      <Button variant="secondary" onClick={() => void start()} loading={Boolean(busy)} title="Imports your name, email and photo from LinkedIn" icon={<LinkedInIcon />}
        className="hover:!border-accent hover:!text-accent-text">Import from LinkedIn</Button>
    </span>
  );
}
