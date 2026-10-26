import type { PDFDocumentProxy } from 'pdfjs-dist';

let lib: Promise<typeof import('pdfjs-dist')> | undefined;

/** Carica pdf.js on demand (non entra nel bundle iniziale). */
export function loadPdfjs() {
  lib ??= import('pdfjs-dist').then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return m;
  });
  return lib;
}

/** `data` viene trasferito al worker di pdf.js: passare una copia se serve ancora l'originale. */
export async function openPdf(buffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  const m = await loadPdfjs();
  return m.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
}

export async function analyzePdf(doc: PDFDocumentProxy) {
  let links = 0;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let text = '';
    for (const it of content.items) {
      if (!('str' in it)) continue;
      text += it.str + (it.hasEOL ? '\n' : '');
    }
    pages.push(text);
    links += (await page.getAnnotations()).filter((a) => a.subtype === 'Link').length;
  }
  return { pages: doc.numPages, links, text: pages };
}
