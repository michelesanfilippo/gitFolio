import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { brand } from '@/config/brand';
import { routing } from '@/i18n/routing';
import { SiteHeader } from '@/components/site-header';
import { AuthProvider } from '@/features/auth/auth-provider';
import '../globals.css';

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
    <html lang={locale} className="dark">
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
