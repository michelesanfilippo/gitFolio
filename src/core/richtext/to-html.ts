import type { Block, Inline, RichText } from './ast';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(i: Inline): string {
  let h = esc(i.text).replace(/\n/g, '<br>');
  if (i.bold) h = `<strong>${h}</strong>`;
  if (i.italic) h = `<em>${h}</em>`;
  if (i.underline) h = `<u>${h}</u>`;
  if (i.link) h = `<a href="${esc(i.link)}">${h}</a>`;
  return h;
}

function block(b: Block): string {
  if (b.type === 'p') return `<p>${b.content.map(inline).join('')}</p>`;
  const tag = b.type;
  return `<${tag}>${b.items.map((it) => `<li><p>${it.map(inline).join('')}</p></li>`).join('')}</${tag}>`;
}

/** AST -> HTML per reinizializzare l'editor TipTap (lo schema dell'editor scarta comunque tutto il resto). */
export const astToHtml = (ast: RichText): string => ast.map(block).join('');
