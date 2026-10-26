import type { NextConfig } from 'next';

// Es. "/gitFolio" per https://michelesanfilippo.github.io/gitFolio ; vuoto in locale.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// Alias manuale invece di `next-intl/plugin`: il plugin carica @swc/core, che su
// questa macchina Windows rifiuta la cache nativa (ACL di C:\). Funzionalmente equivalente.
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: { resolveAlias: { 'next-intl/config': './src/i18n/request.ts' } },
};

export default config;
