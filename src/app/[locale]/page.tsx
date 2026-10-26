import { use } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { withBasePath } from '@/config/brand';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('home');

  return (
    <section className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-16">
      <p className="text-sm uppercase tracking-widest text-accent-text">{t('tagline')}</p>
      <h1 className="text-4xl font-bold sm:text-6xl">{t('title')}</h1>
      <p className="max-w-xl text-lg text-muted">
        {t('subtitle')}
        <br />
        {t('privacy')}
      </p>
      <p className="text-muted">{t('soon')}</p>
      <a href={withBasePath(`/${locale}/spike/`)}
         className="rounded-lg bg-accent px-5 py-3 font-semibold text-accent-fg">
        {t('spike')}
      </a>
    </section>
  );
}
