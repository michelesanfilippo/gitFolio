import { defineRouting } from 'next-intl/routing';

// Solo inglese per ora. Le traduzioni it/fr/de/es restano in /messages (non più instradate):
// per riattivarle basta aggiungere il codice qui e ripristinare lo switcher in site-header.
export const locales = ['en'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});
