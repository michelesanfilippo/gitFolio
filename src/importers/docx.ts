import type { TextLine } from './text-cv';

// DOCX → righe di testo. Un .docx è uno zip: si legge l'indice, si decomprime word/document.xml con DecompressionStream
// (nessuna libreria) e si estraggono i paragrafi con grassetto, punti elenco e dimensione del carattere.

const u16 = (d: DataView, o: number) => d.getUint16(o, true);
const u32 = (d: DataView, o: number) => d.getUint32(o, true);

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Estrae un file dallo zip (solo "stored" o "deflate"). */
export async function zipEntry(buf: ArrayBuffer, name: string): Promise<Uint8Array | undefined> {
  const bytes = new Uint8Array(buf), d = new DataView(buf);
  // End of central directory: cerca la firma dalla fine
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (u32(d, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return undefined;
  const count = u16(d, eocd + 10), cdOff = u32(d, eocd + 16);
  let p = cdOff;
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (u32(d, p) !== 0x02014b50) return undefined;
    const method = u16(d, p + 10), csize = u32(d, p + 20), nameLen = u16(d, p + 28), extraLen = u16(d, p + 30), commentLen = u16(d, p + 32), localOff = u32(d, p + 42);
    const entryName = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (entryName !== name) continue;
    const lNameLen = u16(d, localOff + 26), lExtraLen = u16(d, localOff + 28);
    const start = localOff + 30 + lNameLen + lExtraLen;
    const data = bytes.slice(start, start + csize);
    if (method === 0) return data;
    if (method === 8) return inflateRaw(data);
    throw new Error('Unsupported compression in this .docx');
  }
  return undefined;
}

const decodeXml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');

/** document.xml → righe (un paragrafo per riga; <w:br/> spezza la riga). Esportata per i test. */
export function docxXmlToLines(xml: string): TextLine[] {
  const out: TextLine[] = [];
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g)) {
    const para = m[0];
    const bullet = /<w:numPr>/.test(para);
    const sizeM = /<w:pPr>[\s\S]*?<w:sz w:val="(\d+)"/.exec(para);
    const heading = /<w:pStyle w:val="(Heading\d|Title|Titolo\d?|Titre\d?|berschrift\d?|Ttulo\d?|Subtitle)"/i.test(para);
    let text = '', chars = 0, bold = 0;
    for (const r of para.matchAll(/<w:r[ >][\s\S]*?<\/w:r>|<w:br\/>|<w:tab\/>/g)) {
      const run = r[0];
      if (run === '<w:br/>') { text += '\n'; continue; }
      if (run === '<w:tab/>') { text += ' '; continue; }
      const isBold = /<w:b(?:\s[^>]*)?\/>|<w:b>/.test(run) && !/<w:b w:val="(0|false)"\/>/.test(run);
      for (const t of run.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
        if (t[0] === '<w:tab/>') { text += ' '; continue; }
        if (t[0] === '<w:br/>') { text += '\n'; continue; }
        const s = decodeXml(t[1] ?? '');
        text += s; chars += s.length; if (isBold) bold += s.length;
      }
    }
    const size = sizeM ? Number(sizeM[1]) / 2 : undefined;
    for (const line of text.split('\n')) out.push({ text: line, bold: heading || (chars > 0 && bold / chars > 0.6), size: heading ? (size ?? 14) : size, bullet: bullet || undefined });
  }
  return out;
}

export async function docxToLines(buf: ArrayBuffer): Promise<TextLine[]> {
  const xml = await zipEntry(buf, 'word/document.xml');
  if (!xml) throw new Error('This file is not a Word document (.docx).');
  const lines = docxXmlToLines(new TextDecoder().decode(xml));
  if (!lines.some((l) => l.text.trim())) throw new Error('This document has no text.');
  return lines;
}
