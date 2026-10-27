'use client';

import { useEffect, useRef } from 'react';
import { openPdf } from '@/lib/pdfjs';

/** Anteprima: stesso PDF dell'export, disegnato su canvas con pdf.js (una canvas per pagina). */
export function PdfPreview({ buffer, zoom, onFirstPage }: { buffer: ArrayBuffer | undefined; zoom: number; onFirstPage?: (canvas: HTMLCanvasElement) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buffer || !host.current) return;
    let cancelled = false;
    const el = host.current;
    el.classList.add('preview-stale'); // velo leggero: si sta rigenerando
    (async () => {
      const doc = await openPdf(buffer);
      const canvases: HTMLCanvasElement[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const cssWidth = Math.max(280, (el.clientWidth - 32)) * zoom;
        const scale = cssWidth / base.width;
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${(cssWidth / base.width) * base.height}px`;
        canvas.className = 'preview-page mx-auto mb-4 block bg-white shadow-lg'; // block: centrata e scorre nel riquadro quando è più larga
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `Page ${n} / ${doc.numPages}`);
        await page.render({ canvas, viewport }).promise;
        if (cancelled) return;
        canvases.push(canvas);
      }
      if (!cancelled) {
        // il render precedente resta sotto, sfuma e viene rimosso: niente scatto tra due versioni
        const old = [...el.children] as HTMLElement[];
        for (const c of canvases) c.style.opacity = '0';
        el.append(...canvases);
        requestAnimationFrame(() => {
          el.classList.remove('preview-stale');
          for (const c of canvases) c.style.opacity = '';
          old.forEach((o, i) => { o.classList.add('preview-out'); o.style.top = `${16 + i * ((old[0]?.offsetHeight ?? 0) + 16)}px`; });
          window.setTimeout(() => old.forEach((o) => o.remove()), 260);
        });
        if (canvases[0]) onFirstPage?.(canvases[0]);
      }
      void doc.loadingTask.destroy();
    })().catch((e) => console.error('preview', e));
    return () => { cancelled = true; };
  }, [buffer, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={host} className="scroll-thin relative h-full overflow-auto p-4" />;
}
