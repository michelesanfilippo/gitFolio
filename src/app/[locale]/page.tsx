import { use } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TemplateCarousel } from '@/components/template-carousel';
import { withBasePath } from '@/config/brand';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div className="hero-glow" aria-hidden />
      <section className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-16">
        <p className="text-sm uppercase tracking-widest text-accent-text">{t('tagline')}</p>
        <h1 className="text-4xl font-bold sm:text-6xl">
          {t('title')}
          <br />
          {t('titleLine2')}
        </h1>
        <p className="max-w-xl text-lg text-muted">
          {t('subtitle')}
          <br />
          {t('privacy')}
        </p>
        <a href={withBasePath(`/${locale}/editor/`)}
           className="rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-accent-fg transition-opacity hover:opacity-90">
          {t('cta')}
        </a>
      </section>
      </div>
      <TemplateCarousel locale={locale} label={t('templatesLabel')} />
    </>
  );
}
