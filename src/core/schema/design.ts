import { DEFAULT_SIDE, STANDARD_SECTIONS } from '../content/order';
import type { PatternSettings } from '../pattern/patterns';
import { defaultPattern } from '../pattern/patterns';
import type { PhotoShape } from '../photo/shapes';
import type { BulletId } from '../style/bullets';

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
  /** Sezioni mostrate nella colonna laterale (le altre restano nella colonna principale). */
  sidebarSections: string[];
  /** Ordine di tutte le sezioni (standard e personalizzate). Le mancanti vengono accodate. */
  sectionOrder: string[];
  /** Spazio sopra ogni sezione della colonna laterale (pt): permette di abbassarla rispetto alle altre. */
  sidebarOffsets: Record<string, number>;
  /** Altezza dello sfondo della colonna laterale: pagina intera, quanto il contenuto, oppure % della pagina (solo prima pagina). */
  sidebarHeight: 'full' | 'content' | 'custom';
  sidebarHeightPct: number;
  dateStyle: 'right' | 'inline' | 'below';
}

export interface ContactStyle {
  /** Icona accanto a ogni contatto (email, telefono, LinkedIn...). */
  icons: boolean;
  /** 'auto' = nero o bianco, il più leggibile sullo sfondo del contatto. */
  iconColor: 'auto' | 'black' | 'white' | 'primary' | 'accent';
  iconSize: number; // pt
}

export interface StyleSettings {
  titleStyle: 'plain' | 'underline' | 'bar' | 'box' | 'overline';
  divider: 'none' | 'thin' | 'thick' | 'dotted' | 'dashed';
  bullet: BulletId;
  headerAlign: 'left' | 'center' | 'right';
  sidebarFill: boolean;
  skillStyle: 'list' | 'tags' | 'bars' | 'inline';
}


export interface PhotoSettings {
  /** Posizione: accanto al nome (si sposta con esso) oppure in cima alla colonna laterale, sopra i contatti (solo con 2 colonne). */
  position: 'left' | 'right' | 'top' | 'sidebar';
  shape: PhotoShape;
  size: number; // pt (altezza)
  /** Spessore del bordo in pt (0 = nessun bordo). Fa parte della dimensione totale `size`. */
  borderWidth: number;
  /** Colore del bordo; vuoto = colore principale della palette. */
  borderColor: string;
}

export interface DesignSettings {
  colors: PaletteColors;
  paletteId: string;
  typography: Typography;
  page: PageSettings;
  style: StyleSettings;
  photo: PhotoSettings;
  contacts: ContactStyle;
  /** Decorazione di sfondo (opzionale). */
  pattern: PatternSettings;
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
    sidebarSections: [...DEFAULT_SIDE], sectionOrder: [...STANDARD_SECTIONS], sidebarOffsets: {}, sidebarHeight: 'full', sidebarHeightPct: 60,
  },
  contacts: { icons: true, iconColor: 'auto', iconSize: 10 },
  pattern: { ...defaultPattern },
  photo: { position: 'left', shape: 'circle', size: 84, borderWidth: 0, borderColor: '' },
  style: { titleStyle: 'underline', divider: 'thin', bullet: 'dot', headerAlign: 'left', sidebarFill: false, skillStyle: 'tags' },
});
