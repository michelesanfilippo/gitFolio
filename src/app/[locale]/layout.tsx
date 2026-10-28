import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { brand } from '@/config/brand';
import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/site-header';
import { AuthProvider } from '@/features/auth/auth-provider';
import '../globals.css';

// Carattere dell'interfaccia, servito dal sito stesso (nessuna richiesta a terzi); i file sono gli stessi usati dai template PDF.
const ui = localFont({
  // elenco letterale: next/font lo legge in fase di compilazione
  src: [
    { path: '../../../public/fonts/figtree/figtree-latin-400-normal.woff', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/figtree/figtree-latin-500-normal.woff', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/figtree/figtree-latin-600-normal.woff', weight: '600', style: 'normal' },
    { path: '../../../public/fonts/figtree/figtree-latin-700-normal.woff', weight: '700', style: 'normal' },
  ],
  variable: '--font-ui', display: 'swap', fallback: ['system-ui', 'sans-serif'],
});

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const title = t('title'), description = t('description');
  const url = `${brand.siteUrl}/${locale}/`;
  const image = { url: `${brand.siteUrl}/brand/og.png`, width: 1200, height: 630, alt: `${brand.name} — free & open source CV builder` };
  return {
    title, description,
    metadataBase: new URL(brand.siteUrl),
    openGraph: { title, description, url, siteName: brand.name, type: 'website', locale, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`dark ${ui.variable}`}>
      <body>
        <NextIntlClientProvider>
          <AuthProvider>
            <SiteHeader locale={locale} />
            <main>{children}</main>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
