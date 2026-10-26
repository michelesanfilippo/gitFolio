import { describe, expect, it } from 'vitest';
import { tiptapToAst } from '@/core/richtext/tiptap-to-ast';

describe('tiptapToAst', () => {
  it('maps paragraphs, marks and safe links', () => {
    const ast = tiptapToAst({
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ', marks: [{ type: 'bold' }, { type: 'italic' }] },
            { type: 'text', text: 'site', marks: [{ type: 'link', attrs: { href: 'example.com' } }, { type: 'underline' }] },
          ],
        },
      ],
    });
    expect(ast).toEqual([
      { type: 'p', content: [{ text: 'Hi ', bold: true, italic: true }, { text: 'site', link: 'https://example.com', underline: true }] },
    ]);
  });

  it('drops unsafe link but keeps text', () => {
    const ast = tiptapToAst({
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }],
    });
    expect(ast).toEqual([{ type: 'p', content: [{ text: 'x' }] }]);
  });

  it('maps lists, headings, hard breaks; skips empty paragraphs', () => {
    const ast = tiptapToAst({
      content: [
        { type: 'paragraph' },
        { type: 'heading', content: [{ type: 'text', text: 'T' }] },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }] }] }],
        },
        { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] }] },
      ],
    });
    expect(ast).toEqual([
      { type: 'p', content: [{ text: 'T', bold: true }] },
      { type: 'ul', items: [[{ text: 'a' }, { text: '\n' }, { text: 'b' }]] },
      { type: 'ol', items: [[{ text: '1' }]] },
    ]);
  });
});
