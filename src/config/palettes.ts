import type { Palette } from '@/core/schema/design';

// Palette indipendenti dai template. `label` è l'inglese di riferimento; le traduzioni arriveranno con l'editor (Fase 1).
export const palettes: Palette[] = [
  { id: 'mono-pro', label: 'Professional monochrome', primary: '#1F2937', secondary: '#6B7280', accent: '#374151', heading: '#111827', text: '#1F2937', background: '#FFFFFF', divider: '#D1D5DB', badge: '#F3F4F6' },
  { id: 'navy-grey', label: 'Navy & grey', primary: '#1E3A5F', secondary: '#64748B', accent: '#2F5D8C', heading: '#1E3A5F', text: '#1F2933', background: '#FFFFFF', divider: '#CBD5E1', badge: '#E8EEF5' },
  { id: 'petrol-cream', label: 'Petrol & cream', primary: '#0F5257', secondary: '#5E7F82', accent: '#14808A', heading: '#0F5257', text: '#22302F', background: '#FBF7EE', divider: '#D9D2C0', badge: '#EFE7D3' },
  { id: 'forest', label: 'Forest green', primary: '#1F4D36', secondary: '#5F7A6A', accent: '#2E7D52', heading: '#1F4D36', text: '#1E2A24', background: '#FFFFFF', divider: '#CFDCD3', badge: '#E6EFE9' },
  { id: 'anthracite-azure', label: 'Anthracite & azure', primary: '#2B2F33', secondary: '#6B7480', accent: '#1E88E5', heading: '#2B2F33', text: '#23272B', background: '#FFFFFF', divider: '#D5D9DD', badge: '#E3F0FC' },
  { id: 'bordeaux', label: 'Bordeaux & light grey', primary: '#7A1F32', secondary: '#6D6D72', accent: '#A12B45', heading: '#7A1F32', text: '#26262A', background: '#FFFFFF', divider: '#DDD6D8', badge: '#F1ECEE' },
  { id: 'sand-brown', label: 'Sand & brown', primary: '#5C4033', secondary: '#8A7466', accent: '#A9794F', heading: '#5C4033', text: '#2E2520', background: '#FAF6F0', divider: '#E2D6C6', badge: '#F0E6D6' },
  { id: 'purple', label: 'Contemporary purple', primary: '#5B3FA8', secondary: '#7C7392', accent: '#7C5CE0', heading: '#4A2F94', text: '#231F33', background: '#FFFFFF', divider: '#DDD7EE', badge: '#EEEAFA' },
  { id: 'black-white', label: 'Black & white', primary: '#000000', secondary: '#444444', accent: '#000000', heading: '#000000', text: '#111111', background: '#FFFFFF', divider: '#000000', badge: '#EEEEEE' },
  { id: 'sage', label: 'Sage green', primary: '#4F6F52', secondary: '#7E9381', accent: '#739072', heading: '#3A5A40', text: '#243026', background: '#F8FAF5', divider: '#D4DECF', badge: '#E8EFE2' },
  { id: 'terracotta', label: 'Terracotta', primary: '#B5502F', secondary: '#8C6A5D', accent: '#D9663F', heading: '#8F3A1F', text: '#33231D', background: '#FFFAF6', divider: '#EBD5C9', badge: '#F8E7DD' },
  { id: 'high-contrast', label: 'High contrast', primary: '#000000', secondary: '#1A1A1A', accent: '#0000CC', heading: '#000000', text: '#000000', background: '#FFFFFF', divider: '#000000', badge: '#FFF59D' },
  { id: 'ocean-teal', label: 'Ocean teal', primary: '#0B6E7F', secondary: '#5F8A93', accent: '#12A4B8', heading: '#0B5563', text: '#1B2D31', background: '#FFFFFF', divider: '#CFE3E7', badge: '#E1F2F5' },
  { id: 'rose-slate', label: 'Rose & slate', primary: '#9D3A5C', secondary: '#64748B', accent: '#C2557A', heading: '#7E2D49', text: '#2A2230', background: '#FFFFFF', divider: '#E6D5DC', badge: '#F8E8EE' },
  { id: 'mustard-charcoal', label: 'Mustard & charcoal', primary: '#3A3A3A', secondary: '#707070', accent: '#D9A400', heading: '#2B2B2B', text: '#262626', background: '#FFFFFF', divider: '#E3DCC4', badge: '#FBF1C9' },
  { id: 'gitfolio', label: 'gitFolio (black & lime)', primary: '#171918', secondary: '#5B615C', accent: '#C6F36B', heading: '#171918', text: '#1E2120', background: '#FFFFFF', divider: '#E4E7E2', badge: '#EEF9D3' },
  { id: 'gitfolio-dark', label: 'gitFolio dark', primary: '#C6F36B', secondary: '#A3A9A4', accent: '#C6F36B', heading: '#FFFFFF', text: '#E8EAE6', background: '#171918', divider: '#2B2F2D', badge: '#26302A' },
];

export const getPalette = (id: string) => palettes.find((p) => p.id === id) ?? palettes[0]!;
