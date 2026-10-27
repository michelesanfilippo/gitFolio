import type { Block, Inline, RichText } from './ast';
import { normalizeUrl } from './url';

// Markdown "leggero" per l'editor YAML: paragrafi separati da riga vuota, elenchi con "- " o "1. ",
// **grassetto**, _corsivo_, __sottolineato__, [testo](url). Tutto il resto è testo normale.

const escapeText = (s: string) => s.replace(/([*_[\]\\])/g, '\\$1');

function inlineToMd(i: Inline): string {
  let t = escapeText(i.text);
  if (i.bold) t = `**${t}**`;
  if (i.italic) t = `_${t}_`;
  if (i.underline) t = `__${t}__`;
  if (i.link) t = `[${t}](${i.link})`;
  return t;
}

const BULLET_PREFIX = /^\s*(?:[-*•]|\d+[.)])\s+/;

export function astToMarkdown(ast: RichText | undefined): string {
  if (!ast?.length) return '';
  return ast.map((b) => {
    if (b.type === 'p') return b.content.map(inlineToMd).join('');
    return b.items.map((it, n) => `${b.type === 'ol' ? `${n + 1}.` : '-'} ${it.map(inlineToMd).join('')}`).join('\n');
  }).join('\n\n');
}

/* ------------------------------------------------------------ parsing */

type Mark = 'bold' | 'italic' | 'underline';

/** Riga di testo → inline con marcatori. Marcatori non chiusi restano testo. */
export function parseInlines(line: string): Inline[] {
  const out: Inline[] = [];
  const marks = new Set<Mark>();
  let buf = '';
  const flush = (link?: string) => {
    if (!buf) return;
    const i: Inline = { text: buf };
    if (marks.has('bold')) i.bold = true;
    if (marks.has('italic')) i.italic = true;
    if (marks.has('underline')) i.underline = true;
    if (link) i.link = link;
    out.push(i);
    buf = '';
  };
  const toggle = (m: Mark) => { flush(); if (marks.has(m)) marks.delete(m); else marks.add(m); };
  const closes = (token: string, from: number) => line.indexOf(token, from) !== -1;

  for (let k = 0; k < line.length; k++) {
    const c = line[k]!;
    if (c === '\\' && k + 1 < line.length) { buf += line[k + 1]; k++; continue; }
    if (line.startsWith('**', k) && (marks.has('bold') || closes('**', k + 2))) { toggle('bold'); k++; continue; }
    if (line.startsWith('__', k) && (marks.has('underline') || closes('__', k + 2))) { toggle('underline'); k++; continue; }
    if (c === '_' && (marks.has('italic') || closes('_', k + 1))) { toggle('italic'); continue; }
    if (c === '[') {
      const m = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(line.slice(k));
      const url = m ? normalizeUrl(m[2]!) : null;
      if (m && url) { flush(); buf = m[1]!; flush(url); k += m[0].length - 1; continue; }
    }
    buf += c;
  }
  flush();
  return out;
}

export function markdownToAst(md: string | undefined): RichText | undefined {
  const text = (md ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return undefined;
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: 'ul' | 'ol'; items: Inline[][] } | undefined;
  const flushPara = () => { if (para.length) blocks.push({ type: 'p', content: parseInlines(para.join(' ')) }); para = []; };
  const flushList = () => { if (list) blocks.push(list); list = undefined; };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const m = BULLET_PREFIX.exec(line);
    if (m) {
      flushPara();
      const type = /^\d/.test(m[0].trim()) ? 'ol' : 'ul';
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push(parseInlines(line.slice(m[0].length)));
    } else if (list) {
      // continuazione della voce precedente
      const last = list.items[list.items.length - 1]!;
      last.push({ text: ' ' }, ...parseInlines(line));
    } else para.push(line);
  }
  flushPara(); flushList();
  return blocks.length ? blocks : undefined;
}
