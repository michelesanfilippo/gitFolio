/** Protocolli ammessi per i link. Blocca javascript:, data:, vbscript:, file: ecc. */
export const SAFE_URL = /^(?:https?:\/\/|mailto:|tel:)/i;

export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (SAFE_URL.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // altro schema: rifiutato
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(v) ? `https://${v}` : null; // "example.com/x" -> https
}
