'use client';

import { useEffect } from 'react';
import { basePath } from '@/config/brand';
import { locales } from '@/i18n/routing';

const names: Record<string, string> = { en: 'English', it: 'Italiano', fr: 'Français', de: 'Deutsch', es: 'Español' };

// GitHub Pages non ha middleware/rewrite: la lingua si sceglie lato client.
export default function RootRedirect() {
  useEffect(() => {
    const preferred = navigator.languages.map((l) => l.slice(0, 2).toLowerCase());
    const locale = preferred.find((l) => (locales as readonly string[]).includes(l)) ?? 'en';
    window.location.replace(`${basePath}/${locale}/`);
  }, []);

  return (
    <noscript>
      <ul>
        {locales.map((l) => (
          <li key={l}><a href={`${basePath}/${l}/`}>{names[l]}</a></li>
        ))}
      </ul>
    </noscript>
  );
}
