import type { Block, Inline, RichText } from './ast';
import { normalizeUrl } from './sanitize';

// Subset JSON di TipTap/ProseMirror (schema ristretto: p, heading, liste, hardBreak; marks bold/italic/underline/link).
interface PmNode { type: string; text?: string; content?: PmNode[]; marks?: Array<{ type: string; attrs?: { href?: string } }> }

function inlines(nodes: PmNode[] = []): Inline[] {
  const out: Inline[] = [];
  for (const n of nodes) {
    if (n.type === 'hardBreak') { out.push({ text: '\n' }); continue; }
    if (n.type !== 'text' || !n.text) continue;
    const inline: Inline = { text: n.text };
    for (const m of n.marks ?? []) {
      if (m.type === 'bold') inline.bold = true;
      else if (m.type === 'italic') inline.italic = true;
      else if (m.type === 'underline') inline.underline = true;
      else if (m.type === 'link' && m.attrs?.href) {
        const url = normalizeUrl(m.attrs.href);
        if (url) inline.link = url; // URL non sicuro: il testo resta, il link no
      }
    }
    out.push(inline);
  }
  return out;
}

const itemInlines = (li: PmNode): Inline[] =>
  (li.content ?? []).flatMap((child, i) => (i ? [{ text: '\n' }, ...inlines(child.content)] : inlines(child.content)));

export function tiptapToAst(doc: { content?: PmNode[] } | undefined): RichText {
  const blocks: Block[] = [];
  for (const n of doc?.content ?? []) {
    if (n.type === 'paragraph') {
      const content = inlines(n.content);
      if (content.length) blocks.push({ type: 'p', content });
    } else if (n.type === 'heading') {
      const content = inlines(n.content).map((i) => ({ ...i, bold: true }));
      if (content.length) blocks.push({ type: 'p', content });
    } else if (n.type === 'bulletList' || n.type === 'orderedList') {
      const items = (n.content ?? []).map(itemInlines).filter((i) => i.length);
      if (items.length) blocks.push({ type: n.type === 'bulletList' ? 'ul' : 'ol', items });
    }
  }
  return blocks;
}
