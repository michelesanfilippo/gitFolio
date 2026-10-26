// Lettore ZIP minimale per l'export dati di LinkedIn: legge la directory centrale e decomprime con le API native del browser
// (DecompressionStream 'deflate-raw'). Nessuna dipendenza, nessun invio in rete.

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
export const ZIP_MAX_BYTES = 50 * 1024 * 1024;

export class ZipError extends Error {}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Estrae i file il cui nome soddisfa `want` (percorso senza cartelle). Lancia ZipError se il file non è uno ZIP valido. */
export async function readZip(buf: ArrayBuffer, want: (name: string) => boolean): Promise<Map<string, Uint8Array>> {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new ZipError('not a zip');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const utf8 = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.byteLength || v.getUint32(p, true) !== CENTRAL) throw new ZipError('bad central directory');
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const full = utf8.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    const name = full.split('/').pop() ?? full;
    if (!name || !want(name)) continue;
    if (v.getUint32(local, true) !== LOCAL) throw new ZipError('bad local header');
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + size);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, await inflate(raw));
    // altri metodi (rari) vengono ignorati
  }
  return out;
}
