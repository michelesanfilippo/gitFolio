// Unico punto da modificare per rinominare il prodotto / cambiare logo.
export const brand = {
  name: 'gitFolio',
  repoUrl: 'https://github.com/michelesanfilippo/gitFolio',
  /** URL pubblico del sito (anteprime social, link assoluti). */
  siteUrl: 'https://michelesanfilippo.github.io/gitFolio',
  /** Contatto per privacy e assistenza (pagina /privacy). Vuoto = solo GitHub. */
  contactEmail: '',
  logo: '/brand/logo-full.png',
  mark: '/brand/logo-mark.svg',
  colors: { black: '#171918', lime: '#C6F36B' },
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefissa path di asset statici serviti da public/ (font, worker, logo...). */
export const withBasePath = (path: string) => `${basePath}${path}`;
