'use client';

import { Download, FileText, LayoutTemplate, Palette, RotateCcw, Search, Sparkles, Type, UserRound, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { getPalette } from '@/config/palettes';
import type { Locale } from '@/core/schema/cv';
import { sampleCv } from '@/core/schema/sample';
import { defaultDesign, type DesignSettings, type PaletteColors } from '@/core/schema/design';
import type { RichText } from '@/core/richtext/ast';
import { createPdfRenderer, type PdfRenderer } from '@/exporters/pdf/client';
import { analyzePdf, openPdf } from '@/lib/pdfjs';
import { ColorsPanel, ContentPanel, LayoutPanel, PanelBody, PhotoPanel, StylePanel, TextPanel, type SetDesign } from './panels';
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

const initialDesign = () => defaultDesign(getPalette('gitfolio'), 'gitfolio');

export function DesignLab() {
  const [design, setDesign] = useState<DesignSettings>(initialDesign);
  const [tab, setTab] = useState<TabId>('content');
  const [locale, setLocale] = useState<Locale>('en');
  const [profile, setProfile] = useState<RichText>();
  const [photo, setPhoto] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [buffer, setBuffer] = useState<ArrayBuffer>();
  const [renders, setRenders] = useState(0);
  const [text, setText] = useState<string[]>();
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState<string>();
  const renderer = useRef<PdfRenderer>(undefined);

  const doc = useMemo(() => {
    const base = sampleCv(locale);
    return { ...base, ...(profile ? { profile } : {}), personal: { ...base.personal, photo } };
  }, [locale, profile, photo]);

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
      text: { typography: base.typography }, style: { style: base.style },
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
    <div className="grid h-[calc(100dvh-5.8rem)] grid-cols-1 lg:grid-cols-[420px_1fr]">
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
            <ContentPanel locale={locale} setLocale={setLocale} setProfile={setProfile} showText={showText} setShowText={setShowText} text={text} />
          </PanelBody>
          <PanelBody id="photo" active={tab === 'photo'}><PhotoPanel design={design} set={set} photo={photo} setPhoto={setPhoto} /></PanelBody>
          <PanelBody id="layout" active={tab === 'layout'}><LayoutPanel design={design} set={set} /></PanelBody>
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

      <section className="flex min-h-0 flex-col bg-black/20" aria-label="Preview" data-render-count={renders}>
        <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border px-5 py-3">
          <label className="flex items-center gap-3 text-sm text-muted">
            <Search className="size-6 text-accent" aria-hidden />
            <span className="sr-only">Zoom</span>
            <input type="range" aria-label="Zoom" min={0.5} max={1.6} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-6 w-60 accent-[var(--accent)]" />
            <span className="w-12 text-base font-medium tabular-nums text-fg">{Math.round(zoom * 100)}%</span>
          </label>
          {error ? <span role="alert" className="text-sm text-red-400">Error: {error}</span> : null}
          <button type="button" onClick={download} disabled={!buffer}
            className="ml-auto flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50">
            <Download className="size-4" aria-hidden /> Download PDF
          </button>
        </div>
        <div className="min-h-0 flex-1"><PdfPreview buffer={buffer} zoom={zoom} /></div>
      </section>
    </div>
  );
}
