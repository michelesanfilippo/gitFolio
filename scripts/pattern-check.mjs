// Verifica: pattern di sfondo in vari stili/ancoraggi. Screenshot in /tmp/pat-*.png
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1300 } });
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto('http://localhost:4173/gitFolio/en/editor/');
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(700); return count(); };
let n = await settle(-1);
await p.getByRole('tab', { name: 'Style' }).click();
await p.screenshot({ path: '/tmp/pat-panel.png' });
const kind = (k) => p.getByRole('group', { name: 'Pattern', exact: true }).getByRole('button', { name: k, exact: true });
const anchor = (a) => p.getByRole('button', { name: a, exact: true });
const shots = [['Stars', 'Top right'], ['Leaves', 'Top left'], ['Dashes', 'Bottom right'], ['Waves', 'Top edge'], ['Sparkles', 'Whole page'], ['Dots', 'Bottom left']];
for (const [i, [k, a]] of shots.entries()) {
  await kind(k).click(); n = await settle(n);
  if (i === 0) {} await anchor(a).click(); n = await settle(n);
  await p.locator('canvas').first().screenshot({ path: `/tmp/pat-${i + 1}.png` }); console.log(i + 1, k, a);
}
console.log('errors:', errors); await b.close();
