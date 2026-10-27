'use client';

import { Star } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { brand } from '@/config/brand';

const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const api = () => `https://api.github.com/repos/${new URL(brand.repoUrl).pathname.replace(/^\/|\/$/g, '')}`;

/**
 * Link al repo con il numero di stelle. Il numero arriva dalla build; dopo che l'utente ha cliccato il link (per mettere la
 * stella su GitHub), al ritorno sulla scheda si chiede a GitHub il valore aggiornato. Nessuna richiesta a GitHub per chi
 * non clicca.
 */
export function GithubStars({ initial, icon }: { initial?: number; icon: ReactNode }) {
  const [stars, setStars] = useState(initial);
  const [bump, setBump] = useState(false); // piccolo balzo quando il numero cambia
  const clicked = useRef(false);

  useEffect(() => {
    const refresh = async () => {
      if (!clicked.current || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(api(), { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) return;
        const n = (await res.json() as { stargazers_count?: unknown }).stargazers_count;
        if (typeof n === 'number') setStars((prev) => { if (prev !== n) { setBump(true); window.setTimeout(() => setBump(false), 600); } return n; });
      } catch { /* offline o limite dell'API: resta il valore precedente */ }
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, []);

  return (
    <a href={brand.repoUrl} target="_blank" rel="noopener noreferrer" title="Star gitFolio on GitHub" onClick={() => { clicked.current = true; }}
       aria-label={stars === undefined ? `${brand.name} on GitHub` : `${brand.name} on GitHub: ${stars} ${stars === 1 ? 'star' : 'stars'}`}
       className="-m-1.5 flex items-center gap-2 rounded-md p-1.5 text-sm text-muted transition-colors duration-200 hover:text-accent-text focus-visible:text-accent-text">
      {icon}
      {stars === undefined ? null : (
        <span className={`flex items-center gap-1 font-semibold tabular-nums ${bump ? 'bump' : ''}`} aria-hidden>
          <Star className="size-4" /> {compact(stars)}
        </span>
      )}
    </a>
  );
}
