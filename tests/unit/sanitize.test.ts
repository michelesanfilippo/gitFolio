import { describe, expect, it } from 'vitest';
import { normalizeUrl, sanitizePastedHtml } from '@/core/richtext/sanitize';

describe('sanitizePastedHtml', () => {
  it('strips Word junk, styles, classes, scripts', () => {
    const dirty =
      '<!--[if gte mso 9]><xml>x</xml><![endif]--><p class="MsoNormal" style="mso-margin-top-alt:auto"><span style="font-family:Calibri"><b>Bold</b> text</span></p><script>alert(1)</script><style>p{}</style>';
    expect(sanitizePastedHtml(dirty)).toBe('<p><b>Bold</b> text</p>');
  });
  it('removes unsafe hrefs but keeps text', () => {
    expect(sanitizePastedHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizePastedHtml('<a href="data:text/html;base64,AAAA">y</a>')).toBe('<a>y</a>');
  });
  it('keeps safe links', () => {
    expect(sanitizePastedHtml('<a href="https://example.com">ok</a>')).toContain('href="https://example.com"');
  });
  it('drops event handlers, iframes, svg', () => {
    const out = sanitizePastedHtml('<p onclick="x()">a</p><iframe src="//evil"></iframe><svg onload="x()"></svg>');
    expect(out).toBe('<p>a</p>');
  });
  it('keeps lists and headings', () => {
    expect(sanitizePastedHtml('<ul><li>a</li></ul><h2>t</h2>')).toBe('<ul><li>a</li></ul><h2>t</h2>');
  });
});

describe('normalizeUrl', () => {
  it.each([
    ['https://a.com', 'https://a.com'],
    ['example.com/x?y=1', 'https://example.com/x?y=1'],
    ['me@example.com', 'mailto:me@example.com'],
    ['tel:+391234', 'tel:+391234'],
    ['javascript:alert(1)', null],
    ['data:text/html,x', null],
    ['  ', null],
    ['not a url', null],
  ])('%s', (input, expected) => expect(normalizeUrl(input)).toBe(expected));
});
