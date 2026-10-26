import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'it', 'fr', 'de', 'es'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});
