export interface Palette {
  id: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  heading: string;
  text: string;
  background: string;
  divider: string;
  badge: string;
}
export type PaletteColors = Omit<Palette, 'id' | 'label'>;

export interface Typography {
  headingFont: string;
  bodyFont: string;
  nameSize: number;
  headingSize: number;
  bodySize: number;
  lineHeight: number;
  letterSpacing: number;
  bodyWeight: 300 | 400 | 500;
  headingWeight: 400 | 500 | 600 | 700;
  align: 'left' | 'justify';
  uppercaseHeadings: boolean;
}

export interface PageSettings {
  size: 'A4' | 'LETTER';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number }; // pt
  sectionGap: number;
  itemGap: number;
  columns: 1 | 2;
  columnRatio: number; // % larghezza sidebar
  sidebarSide: 'left' | 'right';
  dateStyle: 'right' | 'inline' | 'below';
}

export interface StyleSettings {
  titleStyle: 'plain' | 'underline' | 'bar' | 'box' | 'overline';
  divider: 'none' | 'thin' | 'thick' | 'dotted' | 'dashed';
  bullet: 'dot' | 'dash' | 'square' | 'arrow' | 'none';
  headerAlign: 'left' | 'center' | 'right';
  sidebarFill: boolean;
  skillStyle: 'list' | 'tags' | 'bars' | 'inline';
}

import type { PhotoShape } from '../photo/shapes';

export interface PhotoSettings {
  /** Posizione rispetto al nome: la foto è sempre ancorata al blocco nome, si sposta con esso. */
  position: 'left' | 'right' | 'top';
  shape: PhotoShape;
  size: number; // pt (altezza)
  ring: boolean; // bordo nel colore primario
}

export interface DesignSettings {
  colors: PaletteColors;
  paletteId: string;
  typography: Typography;
  page: PageSettings;
  style: StyleSettings;
  photo: PhotoSettings;
}

export const defaultDesign = (colors: PaletteColors, paletteId: string): DesignSettings => ({
  colors,
  paletteId,
  typography: {
    headingFont: 'inter', bodyFont: 'inter',
    nameSize: 26, headingSize: 12, bodySize: 9.5, lineHeight: 1.4, letterSpacing: 0,
    bodyWeight: 400, headingWeight: 700, align: 'left', uppercaseHeadings: true,
  },
  page: {
    size: 'A4', orientation: 'portrait',
    margins: { top: 40, right: 40, bottom: 40, left: 40 },
    sectionGap: 14, itemGap: 8, columns: 1, columnRatio: 32, sidebarSide: 'left', dateStyle: 'right',
  },
  photo: { position: 'left', shape: 'circle', size: 84, ring: false },
  style: { titleStyle: 'underline', divider: 'thin', bullet: 'dot', headerAlign: 'left', sidebarFill: false, skillStyle: 'tags' },
});
