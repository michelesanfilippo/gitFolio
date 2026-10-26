import DOMPurify from 'dompurify';

import { normalizeUrl, SAFE_URL } from './url';

export { normalizeUrl };

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
