import type { DesignSettings } from '@/core/schema/design';
import { defaultDesign } from '@/core/schema/design';
import { getPalette } from './palettes';

// Punti di partenza: ogni preset è solo un insieme di DesignSettings (nessun contenuto), quindi cambiare
// preset non tocca i dati dell'utente. Tutto resta modificabile dopo la scelta.

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  design: () => DesignSettings;
}

function build(paletteId: string, tweak: (d: DesignSettings) => void): DesignSettings {
  const { id, label: _label, ...colors } = getPalette(paletteId);
  const d = defaultDesign(colors, id);
  tweak(d);
  return d;
}

export const presets: Preset[] = [
  {
    id: 'lime-classic', name: 'Lime Classic', blurb: 'Clean single column, lime details',
    design: () => build('gitfolio', (d) => {
      d.photo = { ...d.photo, shape: 'circle', borderWidth: 3, borderColor: '#C6F36B', position: 'left' };
      d.style.titleStyle = 'bar';
      d.typography.headingFont = 'manrope';
      d.typography.bodyFont = 'inter';
    }),
  },
  {
    id: 'midnight', name: 'Midnight', blurb: 'Dark page, side column, dotted glow',
    design: () => build('gitfolio-dark', (d) => {
      d.page.columns = 2;
      d.style.sidebarFill = true;
      d.style.titleStyle = 'underline';
      d.style.bullet = 'square';
      d.typography.headingFont = 'space-grotesk';
      d.typography.bodyFont = 'dm-sans';
      d.photo = { ...d.photo, shape: 'rounded', borderWidth: 2, borderColor: '', size: 96 };
      d.pattern = { ...d.pattern, kind: 'dots', anchor: 'top-right', visibility: 0.55, fade: 0.8, widthPct: 55, heightPct: 40, size: 16, spacing: 1.8 };
    }),
  },
  {
    id: 'editorial', name: 'Editorial', blurb: 'Serif elegance, centered header',
    design: () => build('sand-brown', (d) => {
      d.typography.headingFont = 'playfair-display';
      d.typography.bodyFont = 'source-serif-4';
      d.typography.uppercaseHeadings = false;
      d.typography.headingSize = 15;
      d.style.titleStyle = 'overline';
      d.style.headerAlign = 'center';
      d.style.divider = 'dotted';
      d.photo = { ...d.photo, shape: 'arch', position: 'top', size: 110 };
      d.pattern = { ...d.pattern, kind: 'leaves', anchor: 'top-left', visibility: 0.45, fade: 0.75, widthPct: 45, heightPct: 30, size: 22, spacing: 2 };
    }),
  },
  {
    id: 'corporate', name: 'Corporate', blurb: 'Navy, boxed titles, right column',
    design: () => build('navy-grey', (d) => {
      d.page.columns = 2;
      d.page.sidebarSide = 'right';
      d.page.columnRatio = 30;
      d.style.sidebarFill = true;
      d.page.sidebarHeight = 'content';
      d.style.titleStyle = 'box';
      d.style.skillStyle = 'bars';
      d.typography.headingFont = 'ibm-plex-sans';
      d.typography.bodyFont = 'ibm-plex-sans';
      d.photo = { ...d.photo, shape: 'portrait', size: 100, position: 'left' };
    }),
  },
  {
    id: 'minimal', name: 'Minimal', blurb: 'Quiet, airy, nothing extra',
    design: () => build('mono-pro', (d) => {
      d.typography.headingFont = 'work-sans';
      d.typography.bodyFont = 'work-sans';
      d.typography.uppercaseHeadings = false;
      d.typography.headingWeight = 600;
      d.style.titleStyle = 'plain';
      d.style.divider = 'none';
      d.style.bullet = 'dash';
      d.style.skillStyle = 'inline';
      d.page.sectionGap = 20;
      d.photo = { ...d.photo, shape: 'square', size: 78 };
    }),
  },
  {
    id: 'creative', name: 'Creative', blurb: 'Warm color, stars, bold type',
    design: () => build('terracotta', (d) => {
      d.page.columns = 2;
      d.page.columnRatio = 34;
      d.style.sidebarFill = true;
      d.page.sidebarHeight = 'custom';
      d.page.sidebarHeightPct = 62;
      d.style.titleStyle = 'bar';
      d.style.skillStyle = 'bars';
      d.typography.headingFont = 'poppins';
      d.typography.bodyFont = 'dm-sans';
      d.photo = { ...d.photo, shape: 'leaf', size: 100, borderWidth: 3, borderColor: '' };
      d.pattern = { ...d.pattern, kind: 'stars', anchor: 'top-right', visibility: 0.42, fade: 0.8, widthPct: 50, heightPct: 30, size: 20, spacing: 1.9 };
    }),
  },
  {
    id: 'sage-studio', name: 'Sage Studio', blurb: 'Soft green, centered, gentle waves',
    design: () => build('sage', (d) => {
      d.typography.headingFont = 'lora';
      d.typography.bodyFont = 'lato';
      d.typography.uppercaseHeadings = false;
      d.typography.headingSize = 14;
      d.style.titleStyle = 'underline';
      d.style.headerAlign = 'center';
      d.style.divider = 'dashed';
      d.photo = { ...d.photo, shape: 'squircle', position: 'top', size: 92, borderWidth: 3, borderColor: '' };
      d.pattern = { ...d.pattern, kind: 'waves', anchor: 'bottom', visibility: 0.5, fade: 0.6, heightPct: 22, size: 26, spacing: 1.6 };
    }),
  },
  {
    id: 'executive', name: 'Executive', blurb: 'Bordeaux serif, photo in the side column',
    design: () => build('bordeaux', (d) => {
      d.page.columns = 2;
      d.page.columnRatio = 31;
      d.style.titleStyle = 'underline';
      d.style.skillStyle = 'list';
      d.style.divider = 'thin';
      d.typography.headingFont = 'eb-garamond';
      d.typography.bodyFont = 'source-sans-3';
      d.typography.headingSize = 14;
      d.typography.nameSize = 30;
      d.photo = { ...d.photo, shape: 'circle', position: 'sidebar', size: 110, borderWidth: 3, borderColor: '' };
    }),
  },
  {
    id: 'tech', name: 'Tech', blurb: 'Mono headings, teal, crosses',
    design: () => build('ocean-teal', (d) => {
      d.page.columns = 2;
      d.page.sidebarSide = 'right';
      d.page.columnRatio = 30;
      d.style.sidebarFill = true;
      d.style.titleStyle = 'plain';
      d.style.bullet = 'arrow';
      d.style.skillStyle = 'tags';
      d.typography.headingFont = 'jetbrains-mono';
      d.typography.bodyFont = 'ibm-plex-sans';
      d.typography.uppercaseHeadings = false;
      d.typography.headingSize = 12;
      d.photo = { ...d.photo, shape: 'rounded', size: 88, position: 'left' };
      d.pattern = { ...d.pattern, kind: 'plus', anchor: 'top-left', visibility: 0.5, fade: 0.8, widthPct: 45, heightPct: 24, size: 14, spacing: 1.9 };
    }),
  },
  {
    id: 'rose', name: 'Rose', blurb: 'Rose and slate, right-aligned, sparkles',
    design: () => build('rose-slate', (d) => {
      d.typography.headingFont = 'outfit';
      d.typography.bodyFont = 'figtree';
      d.style.headerAlign = 'right';
      d.style.titleStyle = 'bar';
      d.style.bullet = 'dash';
      d.photo = { ...d.photo, shape: 'squircle', position: 'right', size: 92 };
      d.pattern = { ...d.pattern, kind: 'sparkles', anchor: 'top-right', visibility: 0.5, fade: 0.8, widthPct: 42, heightPct: 20, size: 18, spacing: 1.9 };
    }),
  },
  {
    id: 'bold', name: 'Bold', blurb: 'Charcoal and mustard, boxed titles',
    design: () => build('mustard-charcoal', (d) => {
      d.typography.headingFont = 'montserrat';
      d.typography.bodyFont = 'inter';
      d.typography.headingWeight = 700;
      d.style.titleStyle = 'box';
      d.style.divider = 'thick';
      d.style.bullet = 'square';
      d.photo = { ...d.photo, shape: 'square', position: 'left', size: 90, borderWidth: 4, borderColor: '#D9A400' };
      d.pattern = { ...d.pattern, kind: 'dashes', anchor: 'bottom-right', visibility: 0.5, fade: 0.8, widthPct: 45, heightPct: 24, size: 18, spacing: 1.7 };
    }),
  },
  {
    id: 'contrast', name: 'Contrast', blurb: 'Black and white, strong lines',
    design: () => build('black-white', (d) => {
      d.page.columns = 2;
      d.page.columnRatio = 33;
      d.style.sidebarFill = true;
      d.style.titleStyle = 'overline';
      d.style.skillStyle = 'inline';
      d.style.divider = 'none';
      d.typography.headingFont = 'space-grotesk';
      d.typography.bodyFont = 'work-sans';
      d.typography.nameSize = 30;
      d.photo = { ...d.photo, shape: 'portrait', position: 'sidebar', size: 118 };
    }),
  },
];

export const getPreset = (id: string | null | undefined) => presets.find((p) => p.id === id);
