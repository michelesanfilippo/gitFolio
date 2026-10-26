import { use } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { HeroWaves } from '@/components/hero-waves';
import { TemplateCarousel } from '@/components/template-carousel';
import { withBasePath } from '@/config/brand';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <div className="flex min-h-[calc(100dvh-4.6rem)] flex-col">
      <div className="relative isolate shrink-0 overflow-hidden">
        <HeroWaves />
      <section className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-8 sm:py-10 [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:py-4">
        <p className="text-sm uppercase tracking-widest text-accent-text">{t('tagline')}</p>
        <h1 className="text-4xl font-bold sm:text-5xl [@media(max-height:700px)]:text-3xl">
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
    </div>
  );
}
