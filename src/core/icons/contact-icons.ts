import type { ContactKind } from '../schema/cv';

// Icone dei contatti (viewBox 24x24, solo contorno). Tracciati derivati da Lucide (ISC License, https://lucide.dev).
// Stesse primitive per il PDF (react-pdf Svg) e per l'interfaccia (svg DOM).
export type IconPrim =
  | { t: 'path'; d: string }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number };

export const CONTACT_ICONS: Record<ContactKind, IconPrim[]> = {
  email: [
    { t: 'rect', x: 2, y: 4, w: 20, h: 16, rx: 2 },
    { t: 'path', d: 'M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' },
  ],
  phone: [
    { t: 'path', d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' },
  ],
  location: [
    { t: 'path', d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z' },
    { t: 'circle', cx: 12, cy: 10, r: 3 },
  ],
  website: [
    { t: 'circle', cx: 12, cy: 12, r: 10 },
    { t: 'path', d: 'M2 12h20' },
    { t: 'path', d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' },
  ],
  linkedin: [
    { t: 'path', d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z' },
    { t: 'rect', x: 2, y: 9, w: 4, h: 12 },
    { t: 'circle', cx: 4, cy: 4, r: 2 },
  ],
  github: [
    { t: 'path', d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' },
    { t: 'path', d: 'M9 18c-4.51 2-5-2-7-2' },
  ],
  link: [
    { t: 'path', d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
    { t: 'path', d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  ],
};

export const CONTACT_KINDS: ContactKind[] = ['email', 'phone', 'location', 'website', 'linkedin', 'github', 'link'];

export const CONTACT_LABEL: Record<ContactKind, string> = {
  email: 'Email', phone: 'Phone', location: 'Location', website: 'Website', linkedin: 'LinkedIn', github: 'GitHub', link: 'Other link',
};

export const CONTACT_PLACEHOLDER: Record<ContactKind, string> = {
  email: 'you@example.com', phone: '+00 000 000 0000', location: 'City, Country',
  website: 'example.com', linkedin: 'linkedin.com/in/your-name', github: 'github.com/your-name', link: 'example.com/portfolio',
};
