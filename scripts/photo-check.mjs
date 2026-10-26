// Verifica in browser: carica una foto, cambia posizione e allineamento intestazione, salva ritagli in /tmp.
// Uso: node scripts/serve-out.mjs & node scripts/photo-check.mjs <immagine.jpg>
import { chromium } from 'playwright';

const image = process.argv[2] ?? '/tmp/portrait-test.jpg';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1500 } });
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto('http://localhost:4173/gitFolio/en/spike/');
let last = '';
const settle = async () => {
  await p.waitForFunction((prev) => { const t = document.querySelector('[aria-live=polite]')?.textContent ?? ''; return /pages/.test(t) && t !== prev; }, last, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(900); last = await p.locator('[aria-live=polite]').textContent();
};
await settle();
await p.getByText('Details', { exact: true }).click();
await p.setInputFiles('[data-testid=photo-input]', image); await settle();
const pos = (n) => p.getByRole('group', { name: 'Position (next to name)' }).getByRole('button', { name: n });
const align = (n) => p.getByRole('group', { name: 'Header alignment' }).getByRole('button', { name: n });
const shot = (n) => p.locator('canvas').first().screenshot({ path: `/tmp/photo-${n}.png` });
const combos = [['Left', 'Left'], ['Right', 'Left'], ['Above', 'Left'], ['Left', 'Center'], ['Left', 'Right'], ['Right', 'Right'], ['Above', 'Center']];
for (const [i, [pp, aa]] of combos.entries()) { await pos(pp).click(); await align(aa).click(); await settle(); await shot(`${i + 1}`); console.log(i + 1, pp, aa); }
console.log(last, 'errors:', errors); await b.close();
