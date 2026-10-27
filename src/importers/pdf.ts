import type { TextLine } from './text-cv';

// PDF → righe di testo con dimensione del carattere e grassetto (dal nome del font), nell'ordine di lettura.
// Le colonne affiancate vengono lette una dopo l'altra: prima la colonna più larga (contenuto principale), poi l'altra.

interface Item { str: string; x: number; y: number; w: number; size: number; bold: boolean; page: number }

/** Unisce gli elementi di testo che stanno sulla stessa riga (stessa pagina, stessa y a meno di mezza riga), da sinistra a
 * destra. Un vuoto ampio (es. data allineata a destra, tag delle competenze) diventa un separatore " | ". */
function toLines(items: Item[]): TextLine[] {
  const sorted = [...items].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const rows: Array<{ page: number; y: number; size: number; items: Item[] }> = [];
  for (const it of sorted) {
    const r = rows[rows.length - 1];
    if (r && r.page === it.page && Math.abs(r.y - it.y) < Math.max(r.size, it.size) * 0.5) { r.items.push(it); r.size = Math.max(r.size, it.size); }
    else rows.push({ page: it.page, y: it.y, size: it.size, items: [it] });
  }
  // margine sinistro più frequente: le righe rientrate di poco rispetto a esso sono punti elenco (il segno è un disegno, non testo)
  const starts = rows.map((r) => Math.round(Math.min(...r.items.map((i) => i.x))));
  const freq = new Map<number, number>();
  for (const s of starts) freq.set(s, (freq.get(s) ?? 0) + 1);
  const base = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  return rows.map((r, k) => {
    const parts = [...r.items].sort((a, b) => a.x - b.x);
    let text = '', end = -Infinity, chars = 0, bold = 0;
    for (const it of parts) {
      const gap = it.x - end;
      const sep = end === -Infinity ? '' : gap > it.size * 1.2 ? ' | ' : gap > it.size * 0.15 && !text.endsWith(' ') && !it.str.startsWith(' ') ? ' ' : '';
      text += sep + it.str; end = Math.max(end, it.x + it.w);
      chars += it.str.length; if (it.bold) bold += it.str.length;
    }
    const indent = starts[k]! - base;
    const bullet = indent > r.size * 0.6 && indent < r.size * 5 && !/^\d+[.)]/.test(text) ? true : undefined;
    return { text: text.replace(/\s+/g, ' ').trim(), size: r.size, bold: chars > 0 && bold / chars > 0.6, bullet };
  });
}

/** Se la pagina ha due colonne (un vuoto verticale netto), restituisce la x di separazione. */
function columnSplit(items: Item[], pageWidth: number): number | undefined {
  // istogramma della copertura orizzontale a passi di 1/60 di pagina
  const bins = 60, cover = new Array<number>(bins).fill(0);
  for (const it of items) {
    const a = Math.max(0, Math.floor((it.x / pageWidth) * bins)), b = Math.min(bins - 1, Math.floor(((it.x + it.w) / pageWidth) * bins));
    for (let k = a; k <= b; k++) cover[k]! += 1;
  }
  // cerca un vuoto tra 25% e 75% della larghezza, con testo da entrambe le parti
  let best: { x: number; len: number } | undefined;
  for (let k = Math.floor(bins * 0.25); k < Math.floor(bins * 0.75); k++) {
    if (cover[k]) continue;
    let j = k; while (j < bins && !cover[j]) j++;
    const left = cover.slice(0, k).reduce((s, v) => s + v, 0), right = cover.slice(j).reduce((s, v) => s + v, 0);
    if (j - k >= 1 && left > 10 && right > 10 && (!best || j - k > best.len)) best = { x: ((k + j) / 2 / bins) * pageWidth, len: j - k };
    k = j;
  }
  return best?.x;
}

/** Legge il PDF nel browser con pdf.js (caricato su richiesta). */
export async function pdfToLines(buffer: ArrayBuffer): Promise<TextLine[]> {
  const { openPdf } = await import('@/lib/pdfjs');
  const doc = await openPdf(buffer);
  try {
    const out: TextLine[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const width = page.getViewport({ scale: 1 }).width;
      const content = await page.getTextContent();
      const items: Item[] = [];
      for (const it of content.items) {
        if (!('str' in it) || !it.str.trim()) continue;
        const [a, b, , , x, y] = it.transform as number[];
        const font = (content.styles as Record<string, { fontFamily?: string }>)[it.fontName]?.fontFamily ?? it.fontName;
        items.push({ str: it.str, x: x!, y: y!, w: it.width, size: Math.round(Math.hypot(a!, b!) * 10) / 10 || it.height, bold: /bold|black|heavy|semibold|demibold/i.test(`${it.fontName} ${font}`), page: p });
      }
      const split = columnSplit(items, width);
      if (split === undefined) { out.push(...toLines(items)); continue; }
      const left = items.filter((i) => i.x < split), right = items.filter((i) => i.x >= split);
      const widthOf = (col: Item[]) => Math.max(...col.map((i) => i.x + i.w)) - Math.min(...col.map((i) => i.x));
      const [main, side] = widthOf(left) >= widthOf(right) ? [left, right] : [right, left];
      out.push(...toLines(main), { text: '' }, ...toLines(side));
    }
    if (!out.some((l) => l.text)) throw new Error('This PDF has no selectable text (it may be a scan).');
    return out;
  } finally {
    void doc.loadingTask.destroy();
  }
}
