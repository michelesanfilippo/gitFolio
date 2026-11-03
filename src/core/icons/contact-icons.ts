import type { ContactKind } from '../schema/cv';
import { ICON_PATHS, type IconPrim } from './icon-paths';

export type { IconPrim };

export const CONTACT_KINDS: ContactKind[] = ['email', 'phone', 'location', 'birthdate', 'website', 'linkedin', 'github', 'link'];

export const CONTACT_LABEL: Record<ContactKind, string> = {
  email: 'Email', phone: 'Phone', location: 'Location', birthdate: 'Date of birth', website: 'Website', linkedin: 'LinkedIn', github: 'GitHub', link: 'Other link',
};

export const CONTACT_PLACEHOLDER: Record<ContactKind, string> = {
  email: 'you@example.com', phone: '+00 000 000 0000', location: 'City, Country', birthdate: '',
  website: 'example.com', linkedin: 'linkedin.com/in/your-name', github: 'github.com/your-name', link: 'example.com/portfolio',
};

/** Icone tra cui scegliere per ogni tipo di contatto; la prima è quella predefinita. */
export const CONTACT_ICON_CHOICES: Record<ContactKind, readonly string[]> = {
  email: ['mail', 'at-sign', 'mail-open', 'send', 'inbox', 'mails'],
  phone: ['phone', 'smartphone', 'phone-call', 'message-circle', 'contact-round', 'phone-outgoing'],
  location: ['map-pin', 'map', 'house', 'building-2', 'navigation', 'compass'],
  birthdate: ['cake', 'calendar', 'calendar-days', 'gift', 'party-popper', 'baby'],
  website: ['globe', 'earth', 'monitor', 'laptop', 'app-window', 'mouse-pointer-click'],
  linkedin: ['linkedin', 'briefcase', 'user-round', 'users', 'id-card', 'network'],
  github: ['github', 'code-xml', 'terminal', 'git-branch', 'git-fork', 'braces'],
  link: ['link', 'external-link', 'paperclip', 'bookmark', 'share-2', 'link-2'],
};

/** Id speciale: nessuna icona per questo contatto. */
export const NO_ICON = 'none';

const ICON_NAME: Record<string, string> = {
  'at-sign': 'At sign', 'mail-open': 'Open mail', 'phone-call': 'Phone call', 'phone-outgoing': 'Outgoing call', 'message-circle': 'Chat', 'contact-round': 'Contact card',
  'map-pin': 'Pin', 'building-2': 'Building', 'calendar-days': 'Calendar days', 'party-popper': 'Party', 'app-window': 'Window', 'mouse-pointer-click': 'Click',
  'user-round': 'Person', 'id-card': 'ID card', 'code-xml': 'Code', 'git-branch': 'Branch', 'git-fork': 'Fork', 'share-2': 'Share', 'link-2': 'Chain link',
  'external-link': 'External link', linkedin: 'LinkedIn', github: 'GitHub',
};

/** Nome leggibile dell'icona (etichetta accessibile dei pulsanti di scelta). */
export const iconName = (id: string): string => (id === NO_ICON ? 'No icon' : ICON_NAME[id] ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '));

/** `icon` se ammessa per quel tipo (o "nessuna"), altrimenti undefined: usata anche per ripulire i dati letti dall'esterno. */
export const validIcon = (kind: ContactKind, icon: unknown): string | undefined =>
  typeof icon === 'string' && (icon === NO_ICON || CONTACT_ICON_CHOICES[kind].includes(icon)) ? icon : undefined;

/** Id dell'icona effettiva del contatto: quella scelta se valida, altrimenti la predefinita del tipo. */
export const contactIconId = (kind: ContactKind, icon?: string): string => validIcon(kind, icon) ?? CONTACT_ICON_CHOICES[kind][0]!;

/** Primitive da disegnare (vuote se il contatto non ha icona). */
export const contactIconPrims = (kind: ContactKind, icon?: string): IconPrim[] => {
  const id = contactIconId(kind, icon);
  return id === NO_ICON ? [] : ICON_PATHS[id] ?? [];
};

export const iconPrims = (id: string): IconPrim[] => ICON_PATHS[id] ?? [];
