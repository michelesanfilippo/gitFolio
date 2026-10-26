// Verifica in browser reale: incolla HTML "Word sporco" nell'editor, controlla sanitizzazione e resa nel PDF.
import { chromium } from 'playwright';

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let alerted = false;
page.on('dialog', (d) => { if (d.type() === 'alert') alerted = true; d.dismiss(); });

await page.goto('http://localhost:4173/gitFolio/en/spike/');
const rte = page.getByTestId('rte');
await rte.click();
await page.keyboard.press('Control+A');
await page.keyboard.press('Delete');

const dirty = '<!--[if gte mso 9]><xml>junk</xml><![endif]--><p class="MsoNormal" style="font-family:Calibri;color:red"><span style="mso-bidi-font-weight:bold"><b>Pasted bold</b> and <i>italic</i> text àèéìòù</span></p><ul><li>First item</li><li>Second item</li></ul><p><a href="javascript:alert(1)">evil link</a> <a href="https://example.com/ok">good link</a></p><script>window.__pwned=1</script><img src=x onerror="window.__pwned=2">';
await rte.evaluate((el, html) => {
  const dt = new DataTransfer();
  dt.setData('text/html', html);
  dt.setData('text/plain', 'plain fallback');
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, dirty);
await page.waitForTimeout(1500);

const html = await rte.innerHTML();
console.log('editor html:', html);
console.log('pwned:', await page.evaluate(() => window.__pwned), 'alert:', alerted);
const checks = {
  noStyle: !/style=|class="Mso|color:red/.test(html),
  noScript: !/<script|onerror|<img/.test(html),
  noJsHref: !/javascript:/.test(html),
  hasBold: /<strong>Pasted bold<\/strong>/.test(html),
  hasList: /<li>.*First item/.test(html),
  hasGoodLink: /href="https:\/\/example.com\/ok"/.test(html),
};
console.log(checks);

// Il testo incollato deve arrivare nel PDF (testo estratto)
await page.getByLabel('Show the text a parser reads').check();
await page.waitForTimeout(2500);
const text = await page.locator('pre').first().textContent();
console.log('pdf has pasted text:', /Pasted bold/.test(text) && /First item/.test(text) && /good link/.test(text), '| evil link text kept:', /evil link/.test(text));
console.log('errors:', errors);
await b.close();
