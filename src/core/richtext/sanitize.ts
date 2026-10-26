import DOMPurify from 'dompurify';

/** Protocolli ammessi per i link. Blocca javascript:, data:, vbscript:, file: ecc. */
const SAFE_URL = /^(?:https?:\/\/|mailto:|tel:)/i;

export function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (SAFE_URL.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return null; // altro schema: rifiutato
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(v) ? `https://${v}` : null; // "example.com/x" -> https
}

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4'];

let configured = false;
function configure() {
  if (configured) return;
  configured = true;
  // Dopo la sanitizzazione di base: rimuove href non ammessi (DOMPurify permette alcuni schemi come ftp/sms).
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (!SAFE_URL.test(href)) node.removeAttribute('href');
      else node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
}

/**
 * Sanifica HTML incollato (Word, Google Docs, web): solo tag di formattazione base, nessun attributo
 * tranne `href` sicuro. Stili inline, classi, font, colori e script vengono scartati.
 */
export function sanitizePastedHtml(html: string): string {
  configure();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href'],
    KEEP_CONTENT: true,
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'svg', 'math', 'form'],
  });
}
