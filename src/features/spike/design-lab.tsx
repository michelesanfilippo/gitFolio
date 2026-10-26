'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ColorField, Group, Range, Segmented, Select, Toggle } from '@/components/ui/controls';
import { fontCategories, fonts, availableWeights } from '@/config/fonts';
import { getPalette, palettes } from '@/config/palettes';
import type { CvDocument, Locale } from '@/core/schema/cv';
import { sampleCv } from '@/core/schema/sample';
import { defaultDesign, type DesignSettings, type PaletteColors, type Typography } from '@/core/schema/design';
import { contrastRatio, isValidHex } from '@/core/theme/contrast';
import { createPdfRenderer, type PdfRenderer } from '@/exporters/pdf/client';
import { analyzePdf, openPdf } from '@/lib/pdfjs';
import type { RichText } from '@/core/richtext/ast';
import { RichTextEditor } from '@/features/richtext/rich-text-editor';
import { PdfPreview } from './pdf-preview';

// Laboratorio di Fase 0: valida motore PDF + opzioni di design. Sarà sostituito dall'editor (Fase 1) e tradotto allora.

const COLOR_KEYS: Array<[keyof PaletteColors, string]> = [
  ['primary', 'Primary'], ['secondary', 'Secondary'], ['accent', 'Accent'], ['heading', 'Headings'],
  ['text', 'Text'], ['background', 'Background'], ['divider', 'Dividers'], ['badge', 'Badges'],
];
const fontOptions = fonts.map((f) => ({ value: f.id, label: f.label, group: f.category[0]!.toUpperCase() + f.category.slice(1) }))
  .sort((a, b) => fontCategories.indexOf(a.group.toLowerCase() as never) - fontCategories.indexOf(b.group.toLowerCase() as never));

const PROFILE_HTML =
  '<p>Software engineer with <strong>10+ years</strong> of experience. Open to <em>international</em> roles — see my <a href="https://example.com/portfolio">portfolio</a>.</p><ul><li>Led a team of 8</li><li>Cut build times by 45%</li></ul>';

const longDoc =(doc: CvDocument, copies: number): CvDocument => ({
  ...doc,
  experience: Array.from({ length: copies }, (_, c) => doc.experience.map((e) => ({ ...e, id: `${e.id}-${c}` }))).flat(),
});

export function DesignLab() {
  const [design, setDesign] = useState<DesignSettings>(() => defaultDesign(getPalette('gitfolio'), 'gitfolio'));
  const [locale, setLocale] = useState<Locale>('en');
  const [copies, setCopies] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [buffer, setBuffer] = useState<ArrayBuffer>();
  const [stats, setStats] = useState<{ ms: number; pages: number; links: number }>();
  const [text, setText] = useState<string[]>();
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState<string>();
  const renderer = useRef<PdfRenderer>(undefined);

  const [profile, setProfile] = useState<RichText>();
  const doc = useMemo(() => {
    const base = longDoc(sampleCv(locale), copies);
    return profile ? { ...base, profile } : base;
  }, [locale, copies, profile]);

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
        const pdf = await openPdf(res.buffer);
        const info = await analyzePdf(pdf);
        setStats({ ms: res.ms, pages: info.pages, links: info.links });
        setText(info.text);
        void pdf.loadingTask.destroy();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [doc, design]);

  const set = <K extends keyof DesignSettings>(key: K, patch: Partial<DesignSettings[K]>) =>
    setDesign((d) => ({ ...d, [key]: { ...(d[key] as object), ...patch } }));
  const setMargin = (side: 'top' | 'right' | 'bottom' | 'left', v: number) => set('page', { margins: { ...design.page.margins, [side]: v } });
  const setColor = (k: keyof PaletteColors, v: string) => {
    if (!isValidHex(v)) return setDesign((d) => ({ ...d, colors: { ...d.colors, [k]: v }, paletteId: 'custom' }));
    setDesign((d) => ({ ...d, colors: { ...d.colors, [k]: v.toUpperCase() }, paletteId: 'custom' }));
  };
  const pickPalette = (id: string) => {
    const { id: _id, label: _label, ...colors } = getPalette(id);
    setDesign((d) => ({ ...d, colors, paletteId: id }));
  };

  const t = design.typography;
  const weights = (id: string, allowed: number[]) => availableWeights(id).filter((w) => allowed.includes(w)).map((w) => ({ value: w, label: String(w) }));
  const c = design.colors;
  const warnings = [
    isValidHex(c.text) && isValidHex(c.background) && contrastRatio(c.text, c.background) < 4.5 && `Text/background contrast ${contrastRatio(c.text, c.background).toFixed(1)}:1 (min 4.5:1)`,
    isValidHex(c.heading) && isValidHex(c.background) && contrastRatio(c.heading, c.background) < 3 && `Heading/background contrast ${contrastRatio(c.heading, c.background).toFixed(1)}:1 (min 3:1)`,
    isValidHex(c.secondary) && isValidHex(c.background) && contrastRatio(c.secondary, c.background) < 4.5 && `Secondary/background contrast ${contrastRatio(c.secondary, c.background).toFixed(1)}:1 (min 4.5:1)`,
  ].filter(Boolean) as string[];

  const download = () => {
    if (!buffer) return;
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'gitfolio-test.pdf' });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid h-[calc(100vh-4.5rem)] grid-cols-1 lg:grid-cols-[380px_1fr]">
      <aside className="overflow-y-auto border-r border-border px-4 pb-8" aria-label="Design controls">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-bg py-3 text-xs">
          <button type="button" onClick={download} disabled={!buffer} className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-fg disabled:opacity-50">Download PDF</button>
          <span aria-live="polite" className="text-muted">
            {error ? <span role="alert" className="text-red-400">Error: {error}</span> : stats ? `${stats.ms} ms · ${stats.pages} pages · ${stats.links} links` : '…'}
          </span>
        </div>

        <Group title="Content" open>
          <Select label="CV language (section labels)" value={locale} onChange={setLocale} options={[
            { value: 'en', label: 'English' }, { value: 'it', label: 'Italiano' }, { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' }, { value: 'es', label: 'Español' },
          ]} />
          <Select label="Sample length" value={copies} onChange={setCopies} options={[{ value: 1, label: 'Short' }, { value: 3, label: 'Medium' }, { value: 8, label: 'Very long' }]} />
        </Group>

        <Group title="Profile text (rich editor)">
          <RichTextEditor label="Profile" onChange={setProfile} initialHtml={PROFILE_HTML} />
        </Group>

        <Group title="Page & layout" open>
          <Segmented label="Columns" value={design.page.columns} onChange={(v) => set('page', { columns: v })} options={[{ value: 1, label: '1' }, { value: 2, label: '2' }]} />
          <Segmented label="Sidebar side" value={design.page.sidebarSide} onChange={(v) => set('page', { sidebarSide: v })} options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
          <Range label="Sidebar width" value={design.page.columnRatio} min={22} max={45} unit="%" onChange={(v) => set('page', { columnRatio: v })} />
          <Toggle label="Sidebar background" checked={design.style.sidebarFill} onChange={(v) => set('style', { sidebarFill: v })} />
          <Segmented label="Paper" value={design.page.size} onChange={(v) => set('page', { size: v })} options={[{ value: 'A4', label: 'A4' }, { value: 'LETTER', label: 'US Letter' }]} />
          <Segmented label="Orientation" value={design.page.orientation} onChange={(v) => set('page', { orientation: v })} options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} />
          {(['top', 'right', 'bottom', 'left'] as const).map((s) => (
            <Range key={s} label={`Margin ${s}`} value={design.page.margins[s]} min={14} max={90} unit="pt" onChange={(v) => setMargin(s, v)} />
          ))}
          <Range label="Section spacing" value={design.page.sectionGap} min={4} max={36} unit="pt" onChange={(v) => set('page', { sectionGap: v })} />
          <Range label="Item spacing" value={design.page.itemGap} min={2} max={28} unit="pt" onChange={(v) => set('page', { itemGap: v })} />
          <Segmented wide label="Dates" value={design.page.dateStyle} onChange={(v) => set('page', { dateStyle: v })} options={[{ value: 'right', label: 'Right' }, { value: 'inline', label: 'Inline' }, { value: 'below', label: 'Below' }]} />
        </Group>

        <Group title="Colors" open>
          <Select wide label="Palette" value={design.paletteId} onChange={pickPalette} options={[
            ...(design.paletteId === 'custom' ? [{ value: 'custom', label: 'Custom' }] : []),
            ...palettes.map((p) => ({ value: p.id, label: p.label })),
          ]} />
          {COLOR_KEYS.map(([k, label]) => <ColorField key={k} label={label} value={c[k]} onChange={(v) => setColor(k, v)} />)}
          {warnings.map((w) => <p key={w} role="status" className="col-span-2 rounded-md border border-border bg-surface p-2 text-xs text-amber-400">{w}</p>)}
        </Group>

        <Group title="Typography" open>
          <Select wide label="Heading font" value={t.headingFont} onChange={(v) => set('typography', { headingFont: v })} options={fontOptions} />
          <Select wide label="Body font" value={t.bodyFont} onChange={(v) => set('typography', { bodyFont: v })} options={fontOptions} />
          <Select label="Heading weight" value={t.headingWeight} onChange={(v) => set('typography', { headingWeight: v as Typography['headingWeight'] })} options={weights(t.headingFont, [400, 500, 600, 700])} />
          <Select label="Body weight" value={t.bodyWeight} onChange={(v) => set('typography', { bodyWeight: v as Typography['bodyWeight'] })} options={weights(t.bodyFont, [300, 400, 500])} />
          <Range label="Name size" value={t.nameSize} min={16} max={48} unit="pt" onChange={(v) => set('typography', { nameSize: v })} />
          <Range label="Heading size" value={t.headingSize} min={9} max={22} unit="pt" onChange={(v) => set('typography', { headingSize: v })} />
          <Range label="Text size" value={t.bodySize} min={8} max={13} step={0.5} unit="pt" onChange={(v) => set('typography', { bodySize: v })} />
          <Range label="Line height" value={t.lineHeight} min={1.1} max={1.9} step={0.05} onChange={(v) => set('typography', { lineHeight: v })} />
          <Range label="Letter spacing" value={t.letterSpacing} min={-0.3} max={1.5} step={0.1} unit="pt" onChange={(v) => set('typography', { letterSpacing: v })} />
          <Segmented label="Alignment" value={t.align} onChange={(v) => set('typography', { align: v })} options={[{ value: 'left', label: 'Left' }, { value: 'justify', label: 'Justify' }]} />
          <Toggle label="Uppercase headings" checked={t.uppercaseHeadings} onChange={(v) => set('typography', { uppercaseHeadings: v })} />
        </Group>

        <Group title="Details">
          <Select label="Section titles" value={design.style.titleStyle} onChange={(v) => set('style', { titleStyle: v })} options={[
            { value: 'plain', label: 'Plain' }, { value: 'underline', label: 'Underline' }, { value: 'overline', label: 'Overline' }, { value: 'bar', label: 'Accent bar' }, { value: 'box', label: 'Box' },
          ]} />
          <Select label="Item dividers" value={design.style.divider} onChange={(v) => set('style', { divider: v })} options={[
            { value: 'none', label: 'None' }, { value: 'thin', label: 'Thin' }, { value: 'thick', label: 'Thick' }, { value: 'dotted', label: 'Dotted' }, { value: 'dashed', label: 'Dashed' },
          ]} />
          <Select label="Bullets" value={design.style.bullet} onChange={(v) => set('style', { bullet: v })} options={[
            { value: 'dot', label: 'Dot' }, { value: 'square', label: 'Square' }, { value: 'dash', label: 'Dash' }, { value: 'arrow', label: 'Arrow' }, { value: 'none', label: 'None' },
          ]} />
          <Select label="Skills" value={design.style.skillStyle} onChange={(v) => set('style', { skillStyle: v })} options={[
            { value: 'tags', label: 'Tags' }, { value: 'bars', label: 'Level bars' }, { value: 'list', label: 'List' }, { value: 'inline', label: 'Inline' },
          ]} />
          <Segmented wide label="Header alignment" value={design.style.headerAlign} onChange={(v) => set('style', { headerAlign: v })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
        </Group>

        <div className="py-3">
          <Toggle label="Show extracted text (what an ATS parser reads)" checked={showText} onChange={setShowText} />
          {showText && text ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface p-2 text-xs">{text.map((p, i) => `--- page ${i + 1} ---\n${p}`).join('\n')}</pre> : null}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-black/20" aria-label="Preview">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2 text-xs">
          <label className="flex items-center gap-2">Zoom
            <input type="range" min={0.5} max={1.6} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="accent-[var(--accent)]" />
            <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
          </label>
        </div>
        <div className="min-h-0 flex-1"><PdfPreview buffer={buffer} zoom={zoom} /></div>
      </section>
    </div>
  );
}
