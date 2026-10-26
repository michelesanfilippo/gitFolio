import { brand, withBasePath } from '@/config/brand';
import { presets } from '@/config/presets';

/**
 * Carosello continuo delle anteprime (immagini pre-renderizzate: la home non carica il motore PDF).
 * Pausa al passaggio del mouse / focus; con "riduci movimento" diventa una fila scorrevole a mano.
 */
export function TemplateCarousel({ locale, label }: { locale: string; label: string }) {
  const group = (hidden: boolean) => (
    <ul className="flex shrink-0 gap-5 pr-5" aria-hidden={hidden || undefined}>
      {presets.map((p) => (
        <li key={p.id} className="w-32 shrink-0 sm:w-40">
          <a href={withBasePath(`/${locale}/editor/?preset=${p.id}`)} tabIndex={hidden ? -1 : undefined}
             title={p.blurb} className="group block rounded-xl focus-visible:outline-offset-4">
            <span className="block overflow-hidden rounded-xl border border-border bg-surface shadow-lg shadow-black/30 transition duration-300 group-hover:-translate-y-1 group-hover:border-accent group-focus-visible:border-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={withBasePath(`/templates/${p.id}.webp`)} alt={hidden ? '' : `${p.name} CV template preview`} width={640} height={905} loading="lazy" className="block h-auto w-full" />
            </span>
            <span className="mt-2 block text-xs font-semibold text-fg group-hover:text-accent-text">{p.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label={label} className="border-t border-border bg-bg py-10">
      <div className="marquee" data-brand={brand.name}>
        <div className="marquee-track">
          {group(false)}
          {group(true)}
          {group(true)}
        </div>
      </div>
    </section>
  );
}
