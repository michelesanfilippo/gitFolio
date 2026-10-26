import { use } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { HeroWaves } from '@/components/hero-waves';
import { PhoneMock } from '@/components/phone-mock';
import { TemplateCarousel } from '@/components/template-carousel';
import { withBasePath } from '@/config/brand';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <div className="flex min-h-[calc(100dvh-4.6rem)] flex-col">
      <div className="relative isolate flex flex-1 items-center overflow-hidden">
        <HeroWaves />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-10 px-6 py-6 [@media(max-height:700px)]:py-3">
        <section className="flex flex-col items-start gap-4 [@media(max-height:700px)]:gap-2">
          <p className="text-sm uppercase tracking-widest text-accent-text">{t('tagline')}</p>
          <h1 className="text-4xl font-bold sm:text-5xl [@media(max-height:700px)]:text-3xl">
            {t('title')}
            <br />
            {t('titleLine2')}
          </h1>
          <p className="max-w-xl text-lg text-muted">{t('subtitle')}</p>
          <a href={withBasePath(`/${locale}/editor/`)}
             className="rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-accent-fg transition-opacity hover:opacity-90">
            {t('cta')}
          </a>
        </section>
        <div className="hidden items-center gap-8 lg:flex xl:translate-x-16">
          <PhoneMock hint={t('phoneHint')} />
          <h2 className="max-w-[11ch] text-2xl font-bold sm:text-3xl [@media(max-height:700px)]:text-2xl">{t('pocket')}</h2>
        </div>
      </div>
      </div>
      <TemplateCarousel locale={locale} label={t('templatesLabel')} cta={t('useTemplate')} />
    </div>
  );
}
