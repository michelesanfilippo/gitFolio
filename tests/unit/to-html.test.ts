import { describe, expect, it } from 'vitest';
import { astToHtml } from '@/core/richtext/to-html';

describe('astToHtml', () => {
  it('serialises marks, links, lists and escapes markup', () => {
    const html = astToHtml([
      { type: 'p', content: [{ text: '<b>x</b> & "y"', bold: true }, { text: 'site', link: 'https://example.com/a?b=1&c=2', italic: true }] },
      { type: 'ul', items: [[{ text: 'one' }], [{ text: 'a\nb' }]] },
    ]);
    expect(html).toBe(
      '<p><strong>&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;</strong><a href="https://example.com/a?b=1&amp;c=2"><em>site</em></a></p>' +
      '<ul><li><p>one</p></li><li><p>a<br>b</p></li></ul>',
    );
  });
});
