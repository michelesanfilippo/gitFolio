'use client';

import { Check, Download, FileText, LayoutTemplate, Minus, Palette, Plus, RotateCcw, Search, Sparkles, Type, UserRound, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { getPalette } from '@/config/palettes';
import { getPreset } from '@/config/presets';
import type { CvDocument } from '@/core/schema/cv';
import { sampleCv } from '@/core/schema/sample';
import { defaultDesign, type DesignSettings, type PaletteColors } from '@/core/schema/design';
import { isPhotoDataUrl, normalizeSaved, type SavedCvData } from '@/core/saved/saved-cv';
import { useAuth } from '@/features/auth/auth-context';
import { createPdfRenderer, type PdfRenderer } from '@/exporters/pdf/client';
import { clearDraft, loadDraft, saveDraft } from '@/lib/local-draft';
import { analyzePdf, openPdf } from '@/lib/pdfjs';
import { ContentPanel } from './content/content-panel';
import { ColorsPanel, LayoutPanel, PanelBody, PhotoPanel, StylePanel, TextPanel, type SetDesign } from './panels';
import { useCloudTemplates } from './cloud';
import { LinkedInImportButton } from './linkedin-import';
import { PdfPreview } from './pdf-preview';

// Laboratorio di Fase 0: valida motore PDF + opzioni di design. Sarà sostituito dall'editor (Fase 1).

type TabId = 'content' | 'photo' | 'layout' | 'colors' | 'text' | 'style';
const TABS: Array<{ id: TabId; label: string; Icon: LucideIcon }> = [
  { id: 'content', label: 'Content', Icon: FileText },
  { id: 'photo', label: 'Photo', Icon: UserRound },
  { id: 'layout', label: 'Layout', Icon: LayoutTemplate },
  { id: 'colors', label: 'Colors', Icon: Palette },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'style', label: 'Style', Icon: Sparkles },
];

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.2;
const ZOOM_STEP = 0.1;
const ZOOM_DEFAULT = 0.8; // all'apertura la pagina intera sta comoda nell'anteprima
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10));

const initialDesign = () => defaultDesign(getPalette('gitfolio'), 'gitfolio');

// Bozza conservata solo durante il redirect del login OAuth (la pagina si ricarica).
const DRAFT_KEY = 'gitfolio:oauth-draft';

/** Miniatura JPEG della prima pagina per la Dashboard. */
function makeThumbnail(src: HTMLCanvasElement): string {
  const w = 260;
  const h = Math.round((src.height * w) / src.width);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return out.toDataURL('image/jpeg', 0.72);
}

export function DesignLab() {
  const [design, setDesign] = useState<DesignSettings>(initialDesign);
  const [tab, setTab] = useState<TabId>('content');
  const [doc, setDocState] = useState<CvDocument>(() => sampleCv('en'));
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [buffer, setBuffer] = useState<ArrayBuffer>();
  const [renders, setRenders] = useState(0);
  const [text, setText] = useState<string[]>();
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState<string>();
  const [docKey, setDocKey] = useState(0); // cambia quando si carica un documento: ricrea gli editor di testo
  const [draftNote, setDraftNote] = useState<string>();
  const renderer = useRef<PdfRenderer>(undefined);
  const thumb = useRef<string>(undefined);
  const auth = useAuth();

  const setDoc = useCallback((fn: (d: CvDocument) => CvDocument) => setDocState(fn), []);
  const photo = doc.personal.photo;
  const setPhoto = useCallback((p: string | undefined) => setDocState((d) => ({ ...d, personal: { ...d.personal, photo: p } })), []);

  /** Applica un documento già validato allo stato dell'editor. */
  const applyNormalized = useCallback((n: { content: CvDocument; design: DesignSettings }) => {
    setDesign(n.design);
    setDocState(n.content);
    setDocKey((k) => k + 1); // ricrea gli editor di testo con il nuovo contenuto
  }, []);

  /** Applica un documento salvato (database o bozza OAuth), validandolo. */
  const applySaved = useCallback((raw: unknown) => {
    const n = normalizeSaved(raw, initialDesign());
    if (!n) return false;
    applyNormalized(n);
    return true;
  }, [applyNormalized]);

  const lastSavedJson = useRef<string>(undefined);
  const photoDecided = useRef(false); // foto predefinita: si applica una sola volta, mai sopra scelte dell'utente
  const autosaveOn = useRef(false);   // attivo solo dopo il ripristino iniziale e fuori dai CV salvati nell'account

  // All'apertura: bozza OAuth > CV salvato (?t=, gestito da useCloudTemplates) > bozza locale. Un preset (?preset=<id>, dalla
  // galleria della home) cambia solo il DESIGN: i contenuti già scritti dall'utente restano.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stash = sessionStorage.getItem(DRAFT_KEY);
    if (stash) {
      sessionStorage.removeItem(DRAFT_KEY);
      try {
        if (applySaved(JSON.parse(stash))) { photoDecided.current = true; autosaveOn.current = true; return; }
      } catch { /* bozza illeggibile: si ignora */ }
    }
    if (params.has('t')) { photoDecided.current = true; return; } // CV dell'account: niente bozza locale
    if (params.has('new')) { // "New CV" dalla Dashboard: si riparte da zero (anche la bozza locale viene scartata)
      clearDraft();
      window.history.replaceState(null, '', window.location.pathname);
      autosaveOn.current = true;
      return;
    }
    const local = loadDraft(initialDesign());
    if (local) {
      applyNormalized(local);
      lastSavedJson.current = JSON.stringify({ v: 2, content: local.content, design: local.design }); // già su disco: niente nuovo salvataggio immediato
      photoDecided.current = true;
      setDraftNote('Restored your last draft from this device.');
      window.setTimeout(() => setDraftNote(undefined), 6000);
    }
    const preset = getPreset(params.get('preset'));
    if (preset) setDesign(preset.design());
    autosaveOn.current = true;
  }, [applySaved, applyNormalized]);

  const snapshot = useCallback((): SavedCvData => ({ v: 2, content: doc, design }), [doc, design]);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  // Prima del redirect OAuth la pagina si ricarica: la bozza passa per sessionStorage (solo in questa scheda).
  useEffect(() => {
    auth.beforeRedirect.current = () => {
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snapshotRef.current())); } catch { /* quota piena: pazienza */ }
    };
    return () => { auth.beforeRedirect.current = null; };
  }, [auth.beforeRedirect]);

  // Foto predefinita dell'account nei CV nuovi.
  useEffect(() => {
    const def = auth.profile?.default_photo;
    if (photoDecided.current || !def || !isPhotoDataUrl(def)) return;
    photoDecided.current = true;
    setDocState((d) => (d.personal.photo ? d : { ...d, personal: { ...d.personal, photo: def } }));
  }, [auth.profile]);

  const cloud = useCloudTemplates({
    getSnapshot: () => snapshotRef.current(),
    getThumbnail: () => thumb.current,
    load: (data) => { applySaved(data); photoDecided.current = true; },
    canSave: Boolean(buffer),
  });

  // Salvataggio automatico locale: solo questo browser, nulla viene inviato. Non parte finché l'utente non cambia qualcosa
  // e si ferma quando si lavora su un CV salvato nell'account (quello si salva con "Save template").
  const baselineJson = useRef<string>(undefined);
  const inAccount = Boolean(cloud.meta) || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('t'));
  useEffect(() => {
    baselineJson.current ??= JSON.stringify({ v: 2, content: sampleCv('en'), design: initialDesign() });
    if (!autosaveOn.current || inAccount) return;
    const json = JSON.stringify(snapshotRef.current());
    if (json === baselineJson.current || json === lastSavedJson.current) return;
    const timer = window.setTimeout(() => {
      if (saveDraft(snapshotRef.current())) { lastSavedJson.current = json; setDraftNote('Draft saved on this device'); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [doc, design, inAccount]);

  // Prima di chiudere/nascondere la scheda si salva subito (il timer potrebbe non scattare).
  useEffect(() => {
    const flush = () => {
      if (!autosaveOn.current || inAccount) return;
      const json = JSON.stringify(snapshotRef.current());
      if (json !== baselineJson.current && json !== lastSavedJson.current && saveDraft(snapshotRef.current())) lastSavedJson.current = json;
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); };
  }, [inAccount]);

  const startOver = useCallback(() => {
    clearDraft();
    lastSavedJson.current = undefined;
    setDesign(initialDesign());
    setDocState(sampleCv('en'));
    setDocKey((k) => k + 1);
    photoDecided.current = false;
    window.history.replaceState(null, '', window.location.pathname);
    setDraftNote('Started over with the placeholder CV.');
    window.setTimeout(() => setDraftNote(undefined), 4000);
  }, []);

  useEffect(() => {
    renderer.current = createPdfRenderer();
    return () => renderer.current?.dispose();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await renderer.current?.render(doc, design);
        if (!res) return; // superata da una richiesta più recente
        setError(undefined);
        setBuffer(res.buffer);
        if (showText) {
          const pdf = await openPdf(res.buffer);
          setText((await analyzePdf(pdf)).text);
          void pdf.loadingTask.destroy();
        }
        setRenders((n) => n + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [doc, design, showText]);

  const set: SetDesign = (key, patch) => setDesign((d) => ({ ...d, [key]: { ...(d[key] as object), ...patch } }));
  const setColor = (k: keyof PaletteColors, v: string) =>
    setDesign((d) => ({ ...d, colors: { ...d.colors, [k]: v.toUpperCase() }, paletteId: 'custom' }));
  const pickPalette = (id: string) => {
    const { id: _id, label: _label, ...colors } = getPalette(id);
    setDesign((d) => ({ ...d, colors, paletteId: id }));
  };

  const reset = () => {
    const base = initialDesign();
    const parts: Partial<Record<TabId, Partial<DesignSettings>>> = {
      photo: { photo: base.photo }, layout: { page: base.page }, colors: { colors: base.colors, paletteId: base.paletteId },
      text: { typography: base.typography }, style: { style: base.style, pattern: base.pattern },
    };
    setDesign((d) => ({ ...d, ...parts[tab] }));
  };

  const download = () => {
    if (!buffer) return;
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'gitfolio-cv.pdf' });
    a.click();
    URL.revokeObjectURL(url);
  };

  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = TABS[(next + TABS.length) % TABS.length]!;
    setTab(target.id);
    document.getElementById(`tab-${target.id}`)?.focus();
  };

  return (
    <div className="grid h-[calc(100dvh-4.6rem)] grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-r border-border" aria-label="Customize your CV">
        <div role="tablist" aria-label="Customization sections" onKeyDown={onTabKey} className="grid shrink-0 grid-cols-6 border-b border-border">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} id={`tab-${id}`} role="tab" type="button" aria-selected={tab === id} aria-controls={`panel-${id}`} tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 border-b-2 px-1 py-3 text-[11px] transition-colors ${tab === id ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
              <Icon className={`size-5 ${tab === id ? 'text-accent-text' : ''}`} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <PanelBody id="content" active={tab === 'content'}>
            <ContentPanel base={{ doc, setDoc, design, set, docKey }} showText={showText} setShowText={setShowText} text={text} onStartOver={startOver} />
          </PanelBody>
          <PanelBody id="photo" active={tab === 'photo'}><PhotoPanel design={design} set={set} photo={photo} setPhoto={setPhoto} /></PanelBody>
          <PanelBody id="layout" active={tab === 'layout'}><LayoutPanel design={design} set={set} doc={doc} /></PanelBody>
          <PanelBody id="colors" active={tab === 'colors'}><ColorsPanel design={design} setColor={setColor} pickPalette={pickPalette} /></PanelBody>
          <PanelBody id="text" active={tab === 'text'}><TextPanel design={design} set={set} /></PanelBody>
          <PanelBody id="style" active={tab === 'style'}><StylePanel design={design} set={set} /></PanelBody>
        </div>

        {tab !== 'content' ? (
          <div className="shrink-0 border-t border-border px-4 py-2.5">
            <button type="button" onClick={reset} className="flex items-center gap-2 text-xs text-muted hover:text-fg">
              <RotateCcw className="size-3.5" aria-hidden /> Reset this section to defaults
            </button>
          </div>
        ) : null}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-black/20" aria-label="Preview" data-render-count={renders}>
        <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
          <div className="flex items-center gap-3 text-sm text-muted">
            <Search className="size-6 text-accent" aria-hidden />
            <input type="range" aria-label="Zoom" min={ZOOM_MIN} max={ZOOM_MAX} step={ZOOM_STEP} value={zoom} onChange={(e) => setZoom(clampZoom(Number(e.target.value)))} className="h-6 w-52 accent-[var(--accent)]" />
            <output aria-live="off" className="w-12 text-base font-medium tabular-nums text-fg">{Math.round(zoom * 100)}%</output>
            <span className="flex gap-1.5">
              <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                className="grid size-9 place-items-center rounded-lg border border-accent/50 text-accent transition-colors hover:bg-accent hover:text-accent-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-accent">
                <Minus className="size-5" aria-hidden />
              </button>
              <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                className="grid size-9 place-items-center rounded-lg border border-accent/50 text-accent transition-colors hover:bg-accent hover:text-accent-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-accent">
                <Plus className="size-5" aria-hidden />
              </button>
            </span>
          </div>
          {error ? <span role="alert" className="text-sm text-red-400">Error: {error}</span> : null}
          {cloud.message}
          {draftNote ? <span role="status" className="flex items-center gap-1.5 text-xs text-muted"><Check className="size-3.5 text-accent" aria-hidden /> {draftNote}</span> : null}
          <div className="ml-auto flex items-center gap-3">
            {cloud.saveButton}
            <LinkedInImportButton doc={doc} onApply={(next) => {
              if (next.personal.photo !== doc.personal.photo) photoDecided.current = true;
              setDocState(next);
              setDocKey((k) => k + 1); // ricrea gli editor di testo con il contenuto importato
            }} />
            <button type="button" onClick={download} disabled={!buffer}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50">
              <Download className="size-4" aria-hidden /> Download PDF
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1"><PdfPreview buffer={buffer} zoom={zoom} onFirstPage={(c) => { thumb.current = makeThumbnail(c); }} /></div>
      </section>
      {cloud.dialogs}
    </div>
  );
}
