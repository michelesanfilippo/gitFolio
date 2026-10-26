import { useTranslations } from 'next-intl';
import { brand, withBasePath } from '@/config/brand';
import { locales } from '@/i18n/routing';

const labels: Record<string, string> = { en: 'EN', it: 'IT', fr: 'FR', de: 'DE', es: 'ES' };

export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations('common');
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <a href={withBasePath(`/${locale}/`)} className="flex items-center gap-2 text-lg font-bold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBasePath(brand.mark)} alt="" width={28} height={28} />
        <span>git<span className="text-accent-text">Folio</span></span>
      </a>
      <nav aria-label={t('language')} className="flex items-center gap-3 text-sm">
        {locales.map((l) => (
          <a key={l} href={withBasePath(`/${l}/`)} hrefLang={l} aria-current={l === locale ? 'true' : undefined}
             className={l === locale ? 'font-bold text-accent-text' : 'text-muted hover:text-fg'}>
            {labels[l]}
          </a>
        ))}
        <a href={brand.repoUrl} className="ml-2 text-muted hover:text-fg">{t('github')}</a>
      </nav>
    </header>
  );
}
