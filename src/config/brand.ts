// Unico punto da modificare per rinominare il prodotto / cambiare logo.
export const brand = {
  name: 'gitFolio',
  repoUrl: 'https://github.com/michelesanfilippo/gitFolio',
  logo: '/brand/logo-full.svg',
  mark: '/brand/logo-mark.svg',
  colors: { black: '#171918', lime: '#C6F36B' },
} as const;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Prefissa path di asset statici serviti da public/ (font, worker, logo...). */
export const withBasePath = (path: string) => `${basePath}${path}`;
