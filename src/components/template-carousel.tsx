import { withBasePath } from '@/config/brand';
import { presets } from '@/config/presets';

const HOLD = 0.8; // quota di ogni passo in cui la card in primo piano resta ferma

/** Keyframes dell'anello: ogni passo ruota di 360/N gradi, poi si ferma. Generati da N, quindi seguono il numero di template. */
function ringKeyframes(n: number): string {
  const step = 100 / n;
  const at = (deg: number) => `transform: translateZ(calc(var(--ring-r) * -0.4)) rotateY(${deg}deg);`;
  const frames: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = -(360 / n) * i;
    const start = (step * i).toFixed(3);
    const holdEnd = (step * i + step * HOLD).toFixed(3);
    frames.push(`${start}%{${at(a)}animation-timing-function:cubic-bezier(.55,0,.2,1)}${holdEnd}%{${at(a)}}`);
  }
  frames.push(`100%{${at(-360)}}`);
  return `@keyframes ring-step{${frames.join('')}}`;
}

/**
 * Carosello 3D: i template sono disposti su un anello che ruota a passi, con la card in primo piano ferma per qualche secondo.
 * Solo CSS 3D (nessuna libreria). Il mouse sopra NON ferma la rotazione; si ferma solo quando un template riceve il focus
 * (clic o tastiera). Con "riduci movimento" diventa una fila piatta scorrevole a mano.
 */
export function TemplateCarousel({ locale, label }: { locale: string; label: string }) {
  const n = presets.length;
  const angle = 360 / n;
  return (
    <section aria-label={label} className="ring-section border-t border-border bg-bg py-8">
      <style>{ringKeyframes(n)}</style>
      <div className="ring-stage" style={{ ['--n' as string]: n }}>
        <ul className="ring" style={{ animationDuration: `${n * 3.6}s` }}>
          {presets.map((p, i) => (
            <li key={p.id} className="ring-card" style={{ ['--a' as string]: `${i * angle}deg` }}>
              <a href={withBasePath(`/${locale}/editor/?preset=${p.id}`)} title={p.blurb} className="group block rounded-xl focus-visible:outline-offset-4">
                <span className="block overflow-hidden rounded-xl border border-border bg-surface shadow-xl shadow-black/40 transition-colors group-hover:border-accent group-focus-visible:border-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={withBasePath(`/templates/${p.id}.webp`)} alt={`${p.name} CV template preview`} width={640} height={905} loading="lazy" className="block h-auto w-full" />
                </span>
                <span className="mt-2 block text-center text-xs font-semibold text-fg group-hover:text-accent-text">{p.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
