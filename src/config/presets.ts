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
];

export const getPreset = (id: string | null | undefined) => presets.find((p) => p.id === id);
