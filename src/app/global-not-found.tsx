import type { Metadata } from 'next';
import { brand, withBasePath } from '@/config/brand';
import './globals.css';

// Pagina 404 del sito statico (GitHub Pages serve 404.html per i percorsi inesistenti). Stesso stile del sito.
export const metadata: Metadata = { title: `Page not found · ${brand.name}` };

export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark">
      <body className="grid min-h-dvh place-items-center px-6">
        <main className="flex max-w-md flex-col items-center gap-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath('/brand/logo-mark.png')} alt="" width={72} height={72} className="pop size-18" />
          <p className="rise text-sm uppercase tracking-widest text-accent-text" style={{ animationDelay: '80ms' }}>Error 404</p>
          <h1 className="rise text-4xl font-bold" style={{ animationDelay: '140ms' }}>This page doesn&apos;t exist.</h1>
          <p className="rise text-muted" style={{ animationDelay: '200ms' }}>The link may be old or mistyped. Your CV, if you were working on one, is still saved in your browser.</p>
          <a href={withBasePath('/en/')} className="btn btn-primary rise h-12 gap-2.5 px-6 text-base" style={{ animationDelay: '260ms' }}>Back to {brand.name}</a>
        </main>
      </body>
    </html>
  );
}
