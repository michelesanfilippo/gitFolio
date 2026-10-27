import { describe, expect, it } from 'vitest';
import { astToMarkdown, markdownToAst } from '@/core/richtext/markdown';
import { p, ul } from '@/core/richtext/ast';

describe('light markdown ↔ rich text', () => {
  it('round-trips paragraphs, lists and marks', () => {
    const ast = [
      p('Hello ', { text: 'bold', bold: true }, ' and ', { text: 'italic', italic: true }, ' and ', { text: 'a link', link: 'https://example.com/x' }, '.'),
      ul(['first item'], ['second ', { text: 'strong', bold: true }]),
      p('Last paragraph'),
    ];
    const md = astToMarkdown(ast);
    expect(md).toBe('Hello **bold** and _italic_ and [a link](https://example.com/x).\n\n- first item\n- second **strong**\n\nLast paragraph');
    expect(markdownToAst(md)).toEqual(ast);
  });

  it('parses ordered lists and keeps stray markers as text', () => {
    expect(markdownToAst('1. one\n2. two')).toEqual([{ type: 'ol', items: [[{ text: 'one' }], [{ text: 'two' }]] }]);
    expect(markdownToAst('5 * 3 = 15 and a_b')).toEqual([{ type: 'p', content: [{ text: '5 * 3 = 15 and a_b' }] }]);
    expect(markdownToAst('')).toBeUndefined();
  });

  it('escapes literal asterisks and underscores on output', () => {
    const ast = [p('snake_case and 2*3')];
    expect(markdownToAst(astToMarkdown(ast))).toEqual(ast);
  });

  it('drops unsafe link targets but keeps the text', () => {
    expect(markdownToAst('[x](javascript:alert(1))')).toEqual([{ type: 'p', content: [{ text: '[x](javascript:alert(1))' }] }]);
  });
});
