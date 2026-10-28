import { use } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
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
      {/* da xl i due blocchi hanno lo stesso margine esterno (quello della colonna centrale di 72rem), che cresce con la larghezza */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-10 px-6 py-6 xl:max-w-none [@media(max-height:700px)]:py-3">
        <section className="flex flex-col items-start gap-5 xl:ml-[calc((100vw-72rem)/2)] [@media(max-height:700px)]:gap-3">
          {/* entrata in sequenza (classe .rise, ritardo crescente); con "riduci movimento" tutto appare subito.
              Titolo grande e stretto che cresce con lo schermo; sotto una sola frase di sostegno, nel colore pieno del testo. */}
          <h1 className="rise text-[clamp(2.25rem,3.9vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.025em] [@media(max-height:700px)]:text-3xl">
            {t('title')}
            <br />
            {t('titleLine2')}
          </h1>
          <p className="rise max-w-xl text-lg leading-snug [@media(max-height:700px)]:text-base" style={{ animationDelay: '80ms' }}>
            {t('tagline')}. {t('subtitle')}
          </p>
          <ButtonLink size="lg" href={withBasePath(`/${locale}/editor/`)} className="rise group mt-1 pl-7 pr-6 text-lg" style={{ animationDelay: '160ms' }}>
            {t('cta')}
            <ArrowRight className="size-5 transition-transform duration-200 ease-out group-hover:translate-x-1" aria-hidden />
          </ButtonLink>
        </section>
        <div className="pop hidden items-center gap-8 md:flex xl:mr-[calc((100vw-72rem)/2)]" style={{ animationDelay: '240ms' }}>
          <PhoneMock />
          {/* frase di accompagnamento al telefono: statement, non titolo (resta sotto i 36px); da tablet c'è posto solo per il telefono */}
          <p className="hidden max-w-[12ch] lg:block text-[clamp(1.75rem,2.4vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.015em] [@media(max-height:700px)]:text-2xl">{t('pocket')}</p>
        </div>
      </div>
      </div>
      <TemplateCarousel locale={locale} label={t('templatesLabel')} cta={t('useTemplate')} />
    </div>
  );
}
