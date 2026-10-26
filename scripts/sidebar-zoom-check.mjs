// Verifica: offset verticale per sezione nella colonna laterale + pulsanti zoom (40%-120%).
import { chromium } from 'playwright';

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1200 } });
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto('http://localhost:4173/gitFolio/en/spike/');
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(700); return count(); };
let n = await settle(-1);

// zoom
const pct = () => p.locator('output').first().textContent();
const out = p.getByRole('button', { name: 'Zoom out' }); const inn = p.getByRole('button', { name: 'Zoom in' });
const slider = p.getByRole('slider', { name: 'Zoom' });
console.log('slider min/max:', await slider.getAttribute('min'), await slider.getAttribute('max'), '| start', await pct());
for (let i = 0; i < 9; i++) if (await out.isEnabled()) await out.click();
console.log('after zoom-out clicks:', await pct(), '| out disabled:', await out.isDisabled());
for (let i = 0; i < 12; i++) if (await inn.isEnabled()) await inn.click();
console.log('after zoom-in clicks:', await pct(), '| in disabled:', await inn.isDisabled());
await slider.fill('1'); console.log('slider->100%:', await pct());
console.log('button colour:', await inn.evaluate((e) => getComputedStyle(e).color));

// offset sezioni laterali
await p.getByRole('tab', { name: 'Layout' }).click();
await p.getByRole('button', { name: 'Two', exact: true }).click(); n = await settle(n);
const setOffset = async (label, v) => { await p.getByLabel(label).fill(String(v)); n = await settle(n); };
await p.locator('canvas').first().screenshot({ path: '/tmp/off-0.png' });
await setOffset('Move Contacts down', 60);
await setOffset('Move Skills down', 40);
await setOffset('Move Languages down', 80);
await p.locator('canvas').first().screenshot({ path: '/tmp/off-1.png' });
console.log('offset sliders visible for side sections:', await p.getByLabel(/^Move .* down$/).count(), '(main sections have none)');
console.log('errors:', errors); await b.close();
