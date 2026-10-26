'use client';

import { AlertTriangle, Check, ExternalLink, FileArchive, Loader2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Modal } from '@/components/ui/modal';
import type { CvDocument } from '@/core/schema/cv';
import { loadPhoto, renderPhoto } from '@/core/photo/process';
import { useAuth } from '@/features/auth/auth-context';
import { applyLinkedIn, availableSections, readLinkedInFiles, type ImportSection, type LinkedInImport } from '@/importers/linkedin/map';
import { ZIP_MAX_BYTES, ZipError } from '@/importers/linkedin/zip';

// Import da LinkedIn in due parti, perché LinkedIn non dà accesso al profilo completo ad app di terze parti:
// 1) login LinkedIn (OpenID) → foto, nome, email;  2) export dati di LinkedIn (ZIP) → esperienze, studi, certificazioni...
// Il file viene letto nel browser; l'utente sceglie le sezioni da importare e poi può modificare tutto a mano.

const EXPORT_URL = 'https://www.linkedin.com/mypreferences/d/download-my-data';
type Pick = ImportSection | 'photo';

const EMPTY: LinkedInImport = { websites: [], experience: [], education: [], certifications: [], skills: [], languages: [], projects: [], approxDates: false };

const LinkedInIcon = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
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

const cls = {
  card: 'flex flex-col gap-3 rounded-xl border border-border bg-bg p-4',
  step: 'grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-fg',
  btn: 'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50',
};

export function LinkedInImportButton({ doc, onApply }: { doc: CvDocument; onApply: (next: CvDocument) => void }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LinkedInImport>();
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [loginError, setLoginError] = useState<string>();
  const [busy, setBusy] = useState<'login' | 'file'>();
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState(false);
  const [pick, setPick] = useState<Set<Pick>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const abort = useRef<AbortController>(undefined);
  const li = auth.linkedIn;

  // Foto del profilo LinkedIn (una volta per sessione del dialog)
  useEffect(() => {
    if (!open || !li?.picture || photo || photoError) return;
    let alive = true;
    photoFromUrl(li.picture).then((p) => { if (alive) setPhoto(p); }, () => { if (alive) setPhotoError(true); });
    return () => { alive = false; };
  }, [open, li?.picture, photo, photoError]);

  /** Dati dell'export + quelli del login (che completano nome ed email se l'export non li ha). */
  const merged = useMemo<LinkedInImport | undefined>(() => {
    if (!data && !li) return undefined;
    const d = data ?? EMPTY;
    return { ...d, fullName: d.fullName ?? li?.name, email: d.email ?? li?.email };
  }, [data, li]);

  const options = useMemo(() => {
    if (!merged) return [];
    const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
    const labels: Record<ImportSection, [string, string?]> = {
      personal: ['Name, headline & contacts', [merged.fullName, merged.headline].filter(Boolean).join(' · ') || undefined],
      profile: ['About', 'Your LinkedIn summary'],
      experience: ['Experience', n(merged.experience.length, 'position', 'positions')],
      education: ['Education', n(merged.education.length, 'school', 'schools')],
      certifications: ['Certifications', n(merged.certifications.length, 'certification', 'certifications')],
      skills: ['Skills', n(merged.skills.length, 'skill', 'skills')],
      languages: ['Languages', n(merged.languages.length, 'language', 'languages')],
      projects: ['Projects', n(merged.projects.length, 'project', 'projects')],
    };
    const list: Array<{ id: Pick; label: string; detail?: string }> = availableSections(merged).map((id) => ({ id, label: labels[id][0], detail: labels[id][1] }));
    if (photo) list.unshift({ id: 'photo', label: 'Profile photo', detail: 'From your LinkedIn account' });
    return list;
  }, [merged, photo]);

  // Ogni nuova sorgente di dati seleziona tutte le sezioni disponibili
  useEffect(() => { setPick(new Set(options.map((o) => o.id))); }, [options]);

  const close = () => { abort.current?.abort(); setOpen(false); };

  async function connect() {
    setBusy('login'); setLoginError(undefined);
    abort.current = new AbortController();
    const err = await auth.signInOAuthPopup('linkedin_oidc', abort.current.signal);
    setBusy(undefined);
    if (err && err !== 'cancelled') setLoginError(err);
  }

  async function readFiles(list: FileList | null | undefined) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    if (files.some((f) => f.size > ZIP_MAX_BYTES)) return setFileError(`File too large (max ${ZIP_MAX_BYTES / 1024 / 1024} MB).`);
    setBusy('file'); setFileError(undefined);
    try {
      const { linkedInToCv } = await import('@/importers/linkedin/map');
      const texts = await readLinkedInFiles(files);
      if (!Object.keys(texts).length) throw new Error('empty');
      const d = linkedInToCv(texts);
      if (!availableSections(d).length) throw new Error('empty');
      setData(d);
      setFileName(files.length === 1 ? files[0]!.name : `${files.length} files`);
    } catch (e) {
      setFileError(e instanceof ZipError ? 'This file is not a valid ZIP archive.'
        : "We couldn't find LinkedIn data in this file. Upload the ZIP you downloaded from LinkedIn (or its CSV files).");
    } finally {
      setBusy(undefined);
    }
  }

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); void readFiles(e.dataTransfer.files); };

  function importNow() {
    if (!merged) return;
    const sections = new Set([...pick].filter((p): p is ImportSection => p !== 'photo'));
    let next = applyLinkedIn(doc, merged, sections);
    if (pick.has('photo') && photo) next = { ...next, personal: { ...next.personal, photo } };
    onApply(next);
    setOpen(false);
  }

  const toggle = (id: Pick) => setPick((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-accent hover:text-accent-text">
        <LinkedInIcon /> Import from LinkedIn
      </button>
      <Modal open={open} onClose={close} title="Import from LinkedIn" size="lg">
        <div className="flex max-h-[72dvh] flex-col gap-4 overflow-y-auto pr-1">
          <p className="text-sm text-muted">
            LinkedIn only shares your name, email and photo with other apps. Everything else (experience, education, certifications,
            skills…) comes from the data export you can download from LinkedIn. You can edit everything afterwards.
          </p>

          <section className={cls.card} aria-labelledby="li-step-1">
            <h3 id="li-step-1" className="flex items-center gap-2 text-sm font-semibold"><span className={cls.step}>1</span> Connect LinkedIn <span className="font-normal text-muted">· photo, name, email</span></h3>
            {li ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photo ? <img src={photo} alt="" className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-[#0A66C2] text-white"><LinkedInIcon /></span>}
                <div className="min-w-0 text-sm">
                  <p className="truncate font-semibold">{li.name ?? 'LinkedIn account'}</p>
                  {li.email ? <p className="truncate text-muted">{li.email}</p> : null}
                </div>
                <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-accent-text"><Check className="size-4" aria-hidden /> Connected</span>
              </div>
            ) : auth.status === 'disabled' ? (
              <p className="text-sm text-muted">LinkedIn sign-in isn&apos;t enabled on this site yet. You can still import your data file below.</p>
            ) : busy === 'login' ? (
              <div className="flex items-center gap-3 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Finish signing in in the LinkedIn window…
                <button type="button" onClick={() => abort.current?.abort()} className="ml-auto text-xs underline hover:text-fg">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => void connect()} className={`${cls.btn} self-start bg-[#0A66C2] text-white`}>
                <LinkedInIcon /> Continue with LinkedIn
              </button>
            )}
            {loginError ? <p role="alert" className="text-xs text-red-400">{loginError}</p> : null}
            {li && photoError ? <p className="text-xs text-muted">Your LinkedIn photo could not be loaded here. You can add it from the Photo tab.</p> : null}
          </section>

          <section className={cls.card} aria-labelledby="li-step-2">
            <h3 id="li-step-2" className="flex items-center gap-2 text-sm font-semibold"><span className={cls.step}>2</span> Add your LinkedIn data export <span className="font-normal text-muted">· experience, education, more</span></h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>On LinkedIn open <strong className="text-fg">Settings → Data privacy → Get a copy of your data</strong>.</li>
              <li>Select <strong className="text-fg">Profile, Positions, Education, Certifications, Skills, Languages</strong> (or the larger archive) and request it.</li>
              <li>Download the ZIP from LinkedIn&apos;s email (usually ready in minutes, up to 24 hours) and drop it here.</li>
            </ol>
            <a href={EXPORT_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 self-start text-sm font-semibold text-accent-text hover:underline">
              Open LinkedIn data export <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <label onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center text-sm transition-colors focus-within:outline focus-within:outline-2 ${dragOver ? 'border-accent bg-accent/10' : 'border-border hover:border-accent'}`}>
              {busy === 'file' ? <Loader2 className="size-5 animate-spin text-muted" aria-hidden />
                : fileName ? <FileArchive className="size-5 text-accent-text" aria-hidden /> : <Upload className="size-5 text-muted" aria-hidden />}
              <span>{fileName ? <><strong>{fileName}</strong> · choose another file</> : <><strong>Choose the ZIP</strong> or drop it here</>}</span>
              <span className="text-xs text-muted">Read in your browser, never uploaded.</span>
              <input type="file" accept=".zip,.csv,application/zip" multiple className="sr-only" data-testid="linkedin-input"
                onChange={(e) => { void readFiles(e.target.files); e.target.value = ''; }} />
            </label>
            {fileError ? <p role="alert" className="text-xs text-red-400">{fileError}</p> : null}
          </section>

          {options.length ? (
            <section className={cls.card} aria-labelledby="li-step-3">
              <h3 id="li-step-3" className="flex items-center gap-2 text-sm font-semibold"><span className={cls.step}>3</span> Choose what to import</h3>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {options.map((o) => (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent">
                      <input type="checkbox" checked={pick.has(o.id)} onChange={() => toggle(o.id)} className="mt-0.5 size-4 accent-[var(--accent)]" />
                      <span className="min-w-0"><span className="block font-medium">{o.label}</span>{o.detail ? <span className="block truncate text-xs text-muted">{o.detail}</span> : null}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">Selected sections replace the current ones. Design, colors and your custom sections stay as they are.</p>
              {merged?.approxDates && (pick.has('experience') || pick.has('education')) ? (
                <p className="flex items-start gap-1.5 text-xs text-amber-300"><AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden /> Some LinkedIn dates only have a year: we set them to January (start) or December (end). Check them after importing.</p>
              ) : null}
            </section>
          ) : null}
        </div>
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
          <p className="mr-auto text-xs text-muted">Signing in creates or links your gitFolio account.</p>
          <button type="button" onClick={close} className={`${cls.btn} border border-border text-fg`}>Cancel</button>
          <button type="button" onClick={importNow} disabled={!pick.size} className={`${cls.btn} bg-accent text-accent-fg`}>Import {pick.size ? `(${pick.size})` : ''}</button>
        </div>
      </Modal>
    </>
  );
}
