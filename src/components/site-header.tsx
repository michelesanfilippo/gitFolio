import { brand, withBasePath } from '@/config/brand';
import { HeaderActions } from '@/features/auth/header-actions';
import { GithubStars } from './github-stars';

function GithubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Stelle del repo lette dall'API pubblica di GitHub durante la build (valore iniziale; GithubStars lo aggiorna dopo un click).
 * Se l'API non risponde il numero non viene mostrato. */
async function repoStars(): Promise<number | undefined> {
  const repo = new URL(brand.repoUrl).pathname.replace(/^\/|\/$/g, '');
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json' }, cache: 'force-cache' });
    if (!res.ok) return undefined;
    const n = (await res.json() as { stargazers_count?: unknown }).stargazers_count;
    return typeof n === 'number' ? n : undefined;
  } catch {
    return undefined;
  }
}

export async function SiteHeader({ locale }: { locale: string }) {
  const stars = await repoStars();
  return (
    <header className="flex items-center justify-between px-6 py-3">
      <a href={withBasePath(`/${locale}/`)} aria-label={brand.name} className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={withBasePath(brand.logo)} alt={brand.name} height={56} className="h-10 w-auto sm:h-12" />
      </a>
      <div className="flex items-center gap-3 sm:gap-4">
        <a href={withBasePath(`/${locale}/privacy/`)} className="hidden py-2 text-sm text-muted transition-colors hover:text-fg sm:inline">Privacy</a>
        <HeaderActions locale={locale} />
        <GithubStars initial={stars} icon={<GithubIcon />} />
      </div>
    </header>
  );
}
