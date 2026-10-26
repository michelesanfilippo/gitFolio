// Smoke test dell'interfaccia del laboratorio in Chromium reale. Uso: node scripts/serve-out.mjs & node scripts/ui-check.mjs [immagine]
import { chromium } from 'playwright';

const image = process.argv[2] ?? '/tmp/portrait-test.jpg';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('requestfailed', (r) => errors.push(`reqfail ${r.url()}`));
await p.goto('http://localhost:4173/gitFolio/en/spike/');

const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(700); return count(); };
let n = await settle(-1);
const tab = (name) => p.getByRole('tab', { name }).click();
const shot = (name) => p.screenshot({ path: `/tmp/ui-${name}.png` });

// 1) stato iniziale: lean, nessuna statistica visibile, Download nella toolbar di anteprima
console.log('stats visible:', await p.getByText(/\d+ ms|\d+ pages|\d+ links/).count());
console.log('download in preview toolbar:', await p.locator('section[aria-label=Preview]').getByRole('button', { name: 'Download PDF' }).count(), '| in left panel:', await p.locator('aside').getByRole('button', { name: 'Download PDF' }).count());
console.log('canvases (pages):', await p.locator('canvas').count());
await shot('1-content');

// 2) download funziona
const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download PDF' }).click()]);
console.log('download:', dl.suggestedFilename());

// 3) foto + tutte le forme
await tab('Photo'); await p.setInputFiles('[data-testid=photo-input]', image); n = await settle(n); await shot('2-photo');
for (const shape of ['Square', 'Rounded', 'Soft', 'Circle', 'Portrait', 'Arch', 'Leaf']) {
  await p.getByRole('button', { name: shape, exact: true }).click(); n = await settle(n);
  await p.locator('canvas').first().screenshot({ path: `/tmp/ui-shape-${shape}.png` });
}
// 4) altre schede
await tab('Layout'); await shot('3-layout');
await tab('Colors'); await p.getByRole('button', { name: 'Bordeaux' }).click(); n = await settle(n); await shot('4-colors');
await tab('Text'); await p.getByRole('button', { name: /Headings & name/ }).click(); await p.waitForTimeout(1200); await shot('5-fontpicker');
await p.getByRole('button', { name: 'Playfair Display' }).click(); n = await settle(n);
await tab('Style'); await p.getByRole('button', { name: 'Box', exact: true }).click(); n = await settle(n); await shot('6-style');
console.log('errors:', errors); await b.close();
