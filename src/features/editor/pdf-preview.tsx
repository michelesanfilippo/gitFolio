'use client';

import { useEffect, useRef } from 'react';
import { openPdf } from '@/lib/pdfjs';

/** Anteprima: stesso PDF dell'export, disegnato su canvas con pdf.js (una canvas per pagina). */
export function PdfPreview({ buffer, zoom }: { buffer: ArrayBuffer | undefined; zoom: number }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buffer || !host.current) return;
    let cancelled = false;
    const el = host.current;
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
        canvas.className = 'mx-auto mb-4 bg-white shadow-lg';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `Page ${n} / ${doc.numPages}`);
        await page.render({ canvas, viewport }).promise;
        if (cancelled) return;
        canvases.push(canvas);
      }
      if (!cancelled) el.replaceChildren(...canvases); // swap atomico: nessun flicker tra due render
      void doc.loadingTask.destroy();
    })().catch((e) => console.error('preview', e));
    return () => { cancelled = true; };
  }, [buffer, zoom]);

  return <div ref={host} className="h-full overflow-auto p-4" />;
}
