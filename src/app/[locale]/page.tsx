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
      {/* da xl il blocco di destra si aggancia al bordo dello schermo (margine che cresce con la larghezza); il testo a sinistra
          resta allineato alla colonna centrale di 72rem */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-10 px-6 py-6 xl:max-w-none [@media(max-height:700px)]:py-3">
        <section className="flex flex-col items-start gap-4 xl:ml-[calc((100vw-72rem)/2)] [@media(max-height:700px)]:gap-2">
          {/* entrata in sequenza (classe .rise, ritardo crescente); con "riduci movimento" tutto appare subito */}
          <p className="rise text-sm uppercase tracking-widest text-accent-text">{t('tagline')}</p>
          <h1 className="rise text-4xl font-bold sm:text-5xl [@media(max-height:700px)]:text-3xl" style={{ animationDelay: '80ms' }}>
            {t('title')}
            <br />
            {t('titleLine2')}
          </h1>
          <p className="rise max-w-xl text-lg text-muted" style={{ animationDelay: '160ms' }}>{t('subtitle')}</p>
          <ButtonLink size="lg" href={withBasePath(`/${locale}/editor/`)} className="rise group mt-1 pr-5 text-lg" style={{ animationDelay: '240ms' }}>
            {t('cta')}
            <ArrowRight className="size-5 transition-transform duration-200 ease-out group-hover:translate-x-1" aria-hidden />
          </ButtonLink>
        </section>
        <div className="pop hidden items-center gap-8 lg:flex xl:mr-[max(1.5rem,calc(10vw-114px))]" style={{ animationDelay: '320ms' }}>
          <PhoneMock />
          <h2 className="max-w-[11ch] text-4xl font-bold sm:text-5xl [@media(max-height:700px)]:text-3xl">{t('pocket')}</h2>
        </div>
      </div>
      </div>
      <TemplateCarousel locale={locale} label={t('templatesLabel')} cta={t('useTemplate')} />
    </div>
  );
}
