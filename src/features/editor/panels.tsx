'use client';

import { useState, type ReactNode } from 'react';
import { ColorField, Choice, Hint, Range, Section, Segmented, Select, Toggle } from '@/components/ui/controls';
import { FontPicker } from '@/components/ui/font-picker';
import { availableWeights } from '@/config/fonts';
import { palettes } from '@/config/palettes';
import type { Locale } from '@/core/schema/cv';
import { SECTION_ORDER, type DesignSettings, type PaletteColors, type SectionId, type Typography } from '@/core/schema/design';
import { PHOTO_SHAPE_IDS, PHOTO_SHAPES, shapeBox } from '@/core/photo/shapes';
import { contrastRatio, isValidHex } from '@/core/theme/contrast';
import { generatePattern, resolvePatternColor, PATTERN_ANCHORS, PATTERN_KINDS, patternRegion, type PatternAnchor, type PatternKind } from '@/core/pattern/patterns';
import { PhotoField } from '@/features/photo/photo-field';
import { RichTextEditor } from '@/features/richtext/rich-text-editor';
import type { RichText } from '@/core/richtext/ast';

export type SetDesign = <K extends keyof DesignSettings>(key: K, patch: Partial<DesignSettings[K]>) => void;
interface DesignProps { design: DesignSettings; set: SetDesign }

/* ------------------------------ mini anteprime ------------------------------ */

const ShapePreview = ({ id }: { id: (typeof PHOTO_SHAPE_IDS)[number] }) => {
  const b = shapeBox(id, 30);
  return <span style={{ width: b.width, height: b.height, background: 'var(--accent)', borderRadius: b.radii.map((r) => `${r}px`).join(' ') }} />;
};

const TitlePreview = ({ kind }: { kind: DesignSettings['style']['titleStyle'] }) => (
  <span className="flex w-12 flex-col gap-1">
    <span className={`flex items-center gap-1 ${kind === 'box' ? 'border-l-2 border-accent bg-border px-1 py-0.5' : ''} ${kind === 'underline' ? 'border-b border-fg pb-0.5' : ''} ${kind === 'overline' ? 'border-t border-fg pt-0.5' : ''}`}>
      {kind === 'bar' ? <i className="h-2.5 w-0.5 bg-accent" /> : null}
      <i className="h-1.5 w-6 rounded-sm bg-fg/80" />
    </span>
    <i className="h-0.5 w-10 bg-muted/60" /><i className="h-0.5 w-7 bg-muted/60" />
  </span>
);

const DividerPreview = ({ kind }: { kind: DesignSettings['style']['divider'] }) =>
  kind === 'none' ? <span className="text-xs text-muted">Off</span> : (
    <span className="w-10 text-fg" style={{ borderTop: `${kind === 'thick' ? 2.5 : 1.5}px ${kind === 'dotted' ? 'dotted' : kind === 'dashed' ? 'dashed' : 'solid'} currentColor` }} />
  );

const KIND_LABEL: Record<PatternKind, string> = {
  none: 'None', dashes: 'Dashes', dots: 'Dots', rings: 'Rings', stars: 'Stars', sparkles: 'Sparkles', leaves: 'Leaves',
  waves: 'Waves', zigzag: 'Zigzag', plus: 'Plus', triangles: 'Triangles', diamonds: 'Diamonds', chevrons: 'Chevrons',
};
const ANCHOR_LABEL: Record<PatternAnchor, string> = {
  'top-left': 'Top left', 'top-right': 'Top right', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right', top: 'Top edge', bottom: 'Bottom edge', full: 'Whole page',
};

const PatternPreview = ({ kind }: { kind: PatternKind }) => {
  if (kind === 'none') return <span className="text-xs text-muted">Off</span>;
  const shapes = generatePattern({ kind, anchor: 'full', color: '', visibility: 1, fade: 0, size: 9, spacing: 1.7, widthPct: 100, heightPct: 100 }, { x: 0, y: 0, width: 44, height: 34 });
  return (
    <svg width="44" height="34" viewBox="0 0 44 34" aria-hidden>
      {shapes.map((sh, i) => {
        const paint = sh.fill ? { fill: 'var(--accent)' } : { fill: 'none', stroke: 'var(--accent)', strokeWidth: sh.strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
        return sh.type === 'circle' ? <circle key={i} cx={sh.cx} cy={sh.cy} r={sh.r} {...paint} /> : <path key={i} d={sh.d} {...paint} />;
      })}
    </svg>
  );
};

const AnchorPreview = ({ anchor }: { anchor: PatternAnchor }) => {
  const r = patternRegion({ kind: 'dots', anchor, color: '', visibility: 1, fade: 0, size: 1, spacing: 1, widthPct: 55, heightPct: 45 }, 26, 34);
  return (
    <span className="relative block border border-muted/60 bg-surface" style={{ width: 26, height: 34 }}>
      <i className="absolute bg-accent/80" style={{ left: r.x, top: r.y, width: r.width, height: r.height }} />
    </span>
  );
};

const BulletPreview = ({ glyph }: { glyph: string }) => <span className="text-lg leading-none text-fg">{glyph}</span>;

const SkillPreview = ({ kind }: { kind: DesignSettings['style']['skillStyle'] }) => {
  if (kind === 'tags') return <span className="flex flex-wrap justify-center gap-0.5"><i className="h-2.5 w-4 rounded-sm bg-border" /><i className="h-2.5 w-5 rounded-sm bg-border" /><i className="h-2.5 w-3 rounded-sm bg-border" /></span>;
  if (kind === 'bars') return <span className="flex w-10 flex-col gap-1"><i className="h-1 w-full rounded bg-border"><i className="block h-1 w-8/12 rounded bg-accent" /></i><i className="h-1 w-full rounded bg-border"><i className="block h-1 w-4/12 rounded bg-accent" /></i></span>;
  if (kind === 'list') return <span className="flex flex-col gap-0.5 text-[9px] leading-none text-fg"><span>• ipsum</span><span>• dolor</span></span>;
  return <span className="text-[9px] leading-none text-fg">ipsum · dolor</span>;
};

const SECTION_LABELS: Record<SectionId, string> = {
  contacts: 'Contacts', profile: 'Profile', experience: 'Experience', education: 'Education',
  projects: 'Projects', skills: 'Skills', languages: 'Languages', certifications: 'Certifications',
};

/** Per ogni sezione: colonna principale o laterale; se laterale, quanto abbassarla rispetto alla precedente. */
function AssignList({ value, offsets, onChange, onOffset }: {
  value: SectionId[]; offsets: Partial<Record<SectionId, number>>; onChange: (v: SectionId[]) => void; onOffset: (id: SectionId, v: number) => void;
}) {
  const side = new Set(value);
  const put = (id: SectionId, toSide: boolean) => {
    const next = new Set(side);
    if (toSide) next.add(id); else next.delete(id);
    onChange(SECTION_ORDER.filter((x) => next.has(x)));
  };
  return (
    <fieldset className="col-span-2">
      <legend className="mb-1.5 text-xs text-muted">What goes in the side column</legend>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {SECTION_ORDER.map((id) => (
          <li key={id} className="px-3 py-1.5">
            <div role="group" aria-label={SECTION_LABELS[id]} className="flex items-center justify-between gap-2">
              <span className="text-sm text-fg">{SECTION_LABELS[id]}</span>
              <span className="flex overflow-hidden rounded-md border border-border">
                {[{ side: false, label: 'Main' }, { side: true, label: 'Side' }].map((o) => (
                  <button key={o.label} type="button" aria-pressed={side.has(id) === o.side} onClick={() => put(id, o.side)}
                    className={`px-3 py-1 text-xs ${side.has(id) === o.side ? 'bg-accent font-semibold text-accent-fg' : 'bg-surface text-muted hover:bg-border'}`}>
                    {o.label}
                  </button>
                ))}
              </span>
            </div>
            {side.has(id) ? (
              <div className="mt-1 grid">
                <Range label={`Move ${SECTION_LABELS[id]} down`} value={offsets[id] ?? 0} min={0} max={300} step={5} unit=" pt" onChange={(v) => onOffset(id, v)} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-muted">Each side-column block can sit lower than the one above it: raise the value to push it down the page.</p>
      {value.length === 0 ? <p className="mt-1.5 text-xs text-amber-300">Nothing selected: the CV stays on a single column.</p> : null}
    </fieldset>
  );
}

/* ---------------------------------- pannelli --------------------------------- */

export function ContentPanel(props: {
  locale: Locale; setLocale: (l: Locale) => void;
  setProfile: (p: RichText) => void; profileHtml: string; profileKey: number; showText: boolean; setShowText: (v: boolean) => void; text?: string[];
}) {
  return (
    <>
      <Section title="Sample content" hint="Placeholder text (lorem ipsum) to try the design. In the real editor this is where your CV data goes.">
        <Select wide label="Language of section titles (Experience, Education…)" value={props.locale} onChange={props.setLocale}
          options={[{ value: 'en', label: 'English' }, { value: 'it', label: 'Italiano' }, { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' }, { value: 'es', label: 'Español' }]} />
      </Section>
      <Section title="Profile text" hint="Format with bold, italic, lists and links. Pasting from Word or Google Docs is cleaned automatically.">
        <div className="col-span-2"><RichTextEditor key={props.profileKey} label="Profile" onChange={props.setProfile} initialHtml={props.profileHtml} /></div>
      </Section>
      <Section title="Recruiter software check" hint="Applicant tracking systems read the text of your PDF. See exactly what they would see.">
        <Toggle label="Show the text a parser reads" checked={props.showText} onChange={props.setShowText} />
        {props.showText && props.text ? (
          <pre className="col-span-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-xs">
            {props.text.map((p, i) => `— page ${i + 1} —\n${p}`).join('\n')}
          </pre>
        ) : null}
      </Section>
    </>
  );
}

export function PhotoPanel({ design, set, photo, setPhoto }: DesignProps & { photo?: string; setPhoto: (p: string | undefined) => void }) {
  return (
    <>
      <Section title="Your photo" hint="Optional. It is cropped and resized on your device and never uploaded.">
        <PhotoField photo={photo} onChange={setPhoto} />
      </Section>
      <Section title="Shape" hint="Pick the frame that fits your style.">
        <Choice label="Frame" cols={4} value={design.photo.shape} onChange={(v) => set('photo', { shape: v })}
          options={PHOTO_SHAPE_IDS.map((id) => ({ value: id, label: PHOTO_SHAPES[id].label, preview: <ShapePreview id={id} /> }))} />
        <Range wide label="Size" value={design.photo.size} min={48} max={150} unit=" pt" onChange={(v) => set('photo', { size: v })} />
        <Range wide label="Border thickness (0 = no border)" value={design.photo.borderWidth} min={0} max={10} step={0.5} unit=" pt" onChange={(v) => set('photo', { borderWidth: v })} />
        {design.photo.borderWidth > 0 ? (
          <>
            <ColorField label="Border color" value={design.photo.borderColor || design.colors.primary} onChange={(v) => set('photo', { borderColor: v.toUpperCase() })} />
            {design.photo.borderColor ? (
              <button type="button" onClick={() => set('photo', { borderColor: '' })} className="self-end rounded-md border border-border px-3 py-2 text-xs text-muted hover:bg-border hover:text-fg">Use palette color</button>
            ) : null}
          </>
        ) : null}
      </Section>
      <Section title="Position" hint="Left, right or above your name, the photo stays attached to it: if the name moves, the photo moves with it. “Side column” puts it at the top of the side column, above Contacts.">
        <Segmented label="Photo placement" value={design.photo.position} onChange={(v) => set('photo', { position: v })}
          options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'top', label: 'Above' }, { value: 'sidebar', label: 'Side column' }]} />
        {design.photo.position === 'sidebar' && !(design.page.columns === 2 && design.page.sidebarSections.length > 0) ? (
          <Hint>The side column needs two columns: turn them on in Layout. Until then the photo sits to the left of your name.</Hint>
        ) : null}
        <Segmented label="Align name and photo" value={design.style.headerAlign} onChange={(v) => set('style', { headerAlign: v })}
          options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
      </Section>
    </>
  );
}

export function LayoutPanel({ design, set }: DesignProps) {
  const [perSide, setPerSide] = useState(false);
  const m = design.page.margins;
  const uniform = m.top === m.right && m.right === m.bottom && m.bottom === m.left;
  const setMargin = (side: keyof typeof m, v: number) => set('page', { margins: { ...m, [side]: v } });
  return (
    <>
      <Section title="Page">
        <Segmented label="Paper size" value={design.page.size} onChange={(v) => set('page', { size: v })} options={[{ value: 'A4', label: 'A4' }, { value: 'LETTER', label: 'US Letter' }]} />
        <Segmented label="Orientation" value={design.page.orientation} onChange={(v) => set('page', { orientation: v })} options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} />
        {perSide ? (['top', 'right', 'bottom', 'left'] as const).map((s) => (
          <Range key={s} label={`Margin ${s}`} value={m[s]} min={14} max={90} unit=" pt" onChange={(v) => setMargin(s, v)} />
        )) : (
          <Range wide label={uniform ? 'Margins' : 'Margins (mixed — move to reset all)'} value={m.top} min={14} max={90} unit=" pt"
            onChange={(v) => set('page', { margins: { top: v, right: v, bottom: v, left: v } })} />
        )}
        <Toggle label="Set each margin separately" checked={perSide} onChange={setPerSide} />
      </Section>
      <Section title="Columns" hint="Two columns add a side column. Choose what goes in it, how wide and how tall it is.">
        <Segmented label="Number of columns" value={design.page.columns} onChange={(v) => set('page', { columns: v })} options={[{ value: 1, label: 'One' }, { value: 2, label: 'Two' }]} />
        {design.page.columns === 2 ? (
          <>
            <Segmented label="Side column position" value={design.page.sidebarSide} onChange={(v) => set('page', { sidebarSide: v })} options={[{ value: 'left', label: 'On the left' }, { value: 'right', label: 'On the right' }]} />
            <Range wide label="Side column width" value={design.page.columnRatio} min={22} max={45} unit="%" onChange={(v) => set('page', { columnRatio: v })} />
            <AssignList value={design.page.sidebarSections} offsets={design.page.sidebarOffsets} onChange={(v) => set('page', { sidebarSections: v })} onOffset={(id, v) => set('page', { sidebarOffsets: { ...design.page.sidebarOffsets, [id]: v } })} />
            <Toggle label="Colored background for the side column" checked={design.style.sidebarFill} onChange={(v) => set('style', { sidebarFill: v })} />
            {design.style.sidebarFill ? (
              <>
                <Segmented label="Side column height" value={design.page.sidebarHeight} onChange={(v) => set('page', { sidebarHeight: v })}
                  options={[{ value: 'full', label: 'Full page' }, { value: 'content', label: 'Fit content' }, { value: 'custom', label: 'Custom' }]} />
                {design.page.sidebarHeight === 'custom' ? (
                  <Range wide label="Height (% of the first page)" value={design.page.sidebarHeightPct} min={20} max={100} step={5} unit="%" onChange={(v) => set('page', { sidebarHeightPct: v })} />
                ) : null}
                <Hint>{{ full: 'The colored background runs edge to edge on every page.', content: 'A card exactly as tall as its content.', custom: 'The background covers only the top of the first page.' }[design.page.sidebarHeight]}</Hint>
              </>
            ) : null}
          </>
        ) : null}
      </Section>
      <Section title="Spacing">
        <Range wide label="Space between sections" value={design.page.sectionGap} min={4} max={36} unit=" pt" onChange={(v) => set('page', { sectionGap: v })} />
        <Range wide label="Space between entries" value={design.page.itemGap} min={2} max={28} unit=" pt" onChange={(v) => set('page', { itemGap: v })} />
        <Segmented label="Dates" value={design.page.dateStyle} onChange={(v) => set('page', { dateStyle: v })} options={[{ value: 'right', label: 'On the right' }, { value: 'inline', label: 'Next to title' }, { value: 'below', label: 'Below' }]} />
      </Section>
    </>
  );
}

const COLOR_KEYS: Array<[keyof PaletteColors, string]> = [
  ['primary', 'Main color'], ['secondary', 'Secondary text'], ['accent', 'Accent'], ['heading', 'Headings'],
  ['text', 'Body text'], ['background', 'Page background'], ['divider', 'Lines'], ['badge', 'Tags & boxes'],
];

export function ColorsPanel({ design, setColor, pickPalette }: { design: DesignSettings; setColor: (k: keyof PaletteColors, v: string) => void; pickPalette: (id: string) => void }) {
  const c = design.colors;
  const check = (fg: string, bg: string, min: number, msg: string) =>
    isValidHex(fg) && isValidHex(bg) && contrastRatio(fg, bg) < min ? `${msg} is hard to read (${contrastRatio(fg, bg).toFixed(1)}:1, aim for ${min}:1 or more).` : null;
  const warnings = [
    check(c.text, c.background, 4.5, 'Body text'),
    check(c.heading, c.background, 3, 'Headings'),
    check(c.secondary, c.background, 4.5, 'Secondary text'),
  ].filter(Boolean) as string[];
  return (
    <>
      <Section title="Color palette" hint="One click changes the whole CV. Fine-tune any color below.">
        <div className="col-span-2 grid grid-cols-3 gap-2" role="group" aria-label="Palettes">
          {palettes.map((p) => {
            const on = design.paletteId === p.id;
            return (
              <button key={p.id} type="button" aria-pressed={on} onClick={() => pickPalette(p.id)} title={p.label}
                className={`flex flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors ${on ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-muted'}`}>
                <span className="flex h-11 items-end gap-0.5 rounded-md p-1.5" style={{ background: p.background, border: `1px solid ${p.divider}` }}>
                  <i className="block h-5 w-2.5 rounded-sm" style={{ background: p.primary }} />
                  <i className="block h-3 w-2.5 rounded-sm" style={{ background: p.accent }} />
                  <i className="block h-4 w-2.5 rounded-sm" style={{ background: p.secondary }} />
                  <i className="ml-auto block h-2 w-3.5 rounded-sm" style={{ background: p.badge, border: `1px solid ${p.divider}` }} />
                </span>
                <span className={`truncate px-0.5 text-[11px] ${on ? 'font-semibold text-fg' : 'text-muted'}`}>{p.label}</span>
              </button>
            );
          })}
        </div>
        {design.paletteId === 'custom' ? <Hint>Custom palette in use. Pick one above to go back to a preset.</Hint> : null}
      </Section>
      <Section title="Customize colors" hint="Type a HEX code or use the color picker.">
        {COLOR_KEYS.map(([k, label]) => <ColorField key={k} label={label} value={c[k]} onChange={(v) => setColor(k, v)} />)}
        {warnings.map((w) => <p key={w} role="status" className="col-span-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-xs text-amber-300">{w}</p>)}
      </Section>
    </>
  );
}

export function TextPanel({ design, set }: DesignProps) {
  const t = design.typography;
  const weights = (id: string, allowed: number[]) => availableWeights(id).filter((w) => allowed.includes(w)).map((w) => ({ value: w, label: String(w) }));
  const weightName: Record<number, string> = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
  const named = (o: Array<{ value: number; label: string }>) => o.map((x) => ({ ...x, label: `${weightName[x.value] ?? ''} (${x.label})` }));
  return (
    <>
      <Section title="Fonts" hint="45 free fonts. Names are shown in their own typeface.">
        <FontPicker label="Headings & name" value={t.headingFont} onChange={(v) => set('typography', { headingFont: v })} />
        <FontPicker label="Body text" value={t.bodyFont} onChange={(v) => set('typography', { bodyFont: v })} />
        <Select label="Heading weight" value={t.headingWeight} onChange={(v) => set('typography', { headingWeight: v as Typography['headingWeight'] })} options={named(weights(t.headingFont, [400, 500, 600, 700]))} />
        <Select label="Body weight" value={t.bodyWeight} onChange={(v) => set('typography', { bodyWeight: v as Typography['bodyWeight'] })} options={named(weights(t.bodyFont, [300, 400, 500]))} />
      </Section>
      <Section title="Sizes">
        <Range wide label="Your name" value={t.nameSize} min={16} max={48} unit=" pt" onChange={(v) => set('typography', { nameSize: v })} />
        <Range wide label="Section titles" value={t.headingSize} min={9} max={22} unit=" pt" onChange={(v) => set('typography', { headingSize: v })} />
        <Range wide label="Body text" value={t.bodySize} min={8} max={13} step={0.5} unit=" pt" onChange={(v) => set('typography', { bodySize: v })} />
      </Section>
      <Section title="Spacing & alignment">
        <Range wide label="Line spacing" value={t.lineHeight} min={1.1} max={1.9} step={0.05} onChange={(v) => set('typography', { lineHeight: v })} />
        <Range wide label="Letter spacing" value={t.letterSpacing} min={-0.3} max={1.5} step={0.1} unit=" pt" onChange={(v) => set('typography', { letterSpacing: v })} />
        <Segmented label="Text alignment" value={t.align} onChange={(v) => set('typography', { align: v })} options={[{ value: 'left', label: 'Left' }, { value: 'justify', label: 'Justified' }]} />
        <Toggle label="UPPERCASE section titles" checked={t.uppercaseHeadings} onChange={(v) => set('typography', { uppercaseHeadings: v })} />
      </Section>
    </>
  );
}

export function StylePanel({ design, set }: DesignProps) {
  const s = design.style;
  return (
    <>
      <Section title="Section titles">
        <Choice label="Title style" cols={5} value={s.titleStyle} onChange={(v) => set('style', { titleStyle: v })}
          options={(['plain', 'underline', 'overline', 'bar', 'box'] as const).map((k) => ({ value: k, label: { plain: 'Plain', underline: 'Underline', overline: 'Overline', bar: 'Bar', box: 'Box' }[k], preview: <TitlePreview kind={k} /> }))} />
      </Section>
      <Section title="Lines between entries">
        <Choice label="Divider" cols={5} value={s.divider} onChange={(v) => set('style', { divider: v })}
          options={(['none', 'thin', 'thick', 'dotted', 'dashed'] as const).map((k) => ({ value: k, label: { none: 'None', thin: 'Thin', thick: 'Thick', dotted: 'Dotted', dashed: 'Dashed' }[k], preview: <DividerPreview kind={k} /> }))} />
      </Section>
      <Section title="Lists">
        <Choice label="Bullet style" cols={5} value={s.bullet} onChange={(v) => set('style', { bullet: v })}
          options={[{ value: 'dot', label: 'Dot', g: '•' }, { value: 'square', label: 'Square', g: '■' }, { value: 'dash', label: 'Dash', g: '–' }, { value: 'arrow', label: 'Arrow', g: '›' }, { value: 'none', label: 'None', g: '∅' }]
            .map((o) => ({ value: o.value as typeof s.bullet, label: o.label, preview: <BulletPreview glyph={o.g} /> }))} />
      </Section>
      <Section title="Background pattern" hint="A subtle decoration behind your CV. Pick a pattern, where it starts and how visible it is. The PDF cannot blur, so visibility and fade make it softer.">
        <Choice label="Pattern" cols={4} value={design.pattern.kind} onChange={(v) => set('pattern', { kind: v })}
          options={PATTERN_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k], preview: <PatternPreview kind={k} /> }))} />
        {design.pattern.kind !== 'none' ? (
          <>
            <Choice label="Starts from" cols={4} value={design.pattern.anchor} onChange={(v) => set('pattern', { anchor: v })}
              options={PATTERN_ANCHORS.map((a) => ({ value: a, label: ANCHOR_LABEL[a], preview: <AnchorPreview anchor={a} /> }))} />
            <Range wide label="Visibility" value={Math.round(design.pattern.visibility * 100)} min={5} max={100} step={5} unit="%" onChange={(v) => set('pattern', { visibility: v / 100 })} />
            <Range wide label="Fade away from the start" value={Math.round(design.pattern.fade * 100)} min={0} max={100} step={5} unit="%" onChange={(v) => set('pattern', { fade: v / 100 })} />
            <ColorField label="Pattern color" value={resolvePatternColor(design.pattern, design.colors, contrastRatio)} onChange={(v) => set('pattern', { color: v.toUpperCase() })} />
            {design.pattern.color ? (
              <button type="button" onClick={() => set('pattern', { color: '' })} className="self-end rounded-md border border-border px-3 py-2 text-xs text-muted hover:bg-border hover:text-fg">Use accent color</button>
            ) : null}
            <Range label="Element size" value={design.pattern.size} min={8} max={48} unit=" pt" onChange={(v) => set('pattern', { size: v })} />
            <Range label="Spacing" value={design.pattern.spacing} min={1.2} max={4} step={0.1} unit="x" onChange={(v) => set('pattern', { spacing: v })} />
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(design.pattern.anchor) ? (
              <Range label="Area width" value={design.pattern.widthPct} min={20} max={100} step={5} unit="%" onChange={(v) => set('pattern', { widthPct: v })} />
            ) : null}
            {design.pattern.anchor !== 'full' ? (
              <Range label="Area height" value={design.pattern.heightPct} min={10} max={100} step={5} unit="%" onChange={(v) => set('pattern', { heightPct: v })} />
            ) : null}
          </>
        ) : null}
      </Section>
      <Section title="Skills">
        <Choice label="Show skills as" cols={4} value={s.skillStyle} onChange={(v) => set('style', { skillStyle: v })}
          options={(['tags', 'bars', 'list', 'inline'] as const).map((k) => ({ value: k, label: { tags: 'Tags', bars: 'Level bars', list: 'List', inline: 'Inline' }[k], preview: <SkillPreview kind={k} /> }))} />
      </Section>
    </>
  );
}

export function PanelBody({ active, id, children }: { active: boolean; id: string; children: ReactNode }) {
  // Tutti i pannelli restano montati (stato dell'editor e della foto conservato): si nascondono soltanto.
  return <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={!active} className="px-4 pb-6">{children}</div>;
}
