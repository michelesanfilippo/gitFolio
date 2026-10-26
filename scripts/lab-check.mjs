// Smoke test del laboratorio design in browser reale. Uso: node scripts/serve-out.mjs & node scripts/lab-check.mjs
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/gitFolio/it/spike/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => errors.push(`reqfail ${r.url()}`));

let last = '';
const stats = async () => {
  const loc = page.locator('[aria-live=polite]');
  await page.waitForFunction(([prev]) => {
    const t = document.querySelector('[aria-live=polite]')?.textContent ?? '';
    return /pages/.test(t) && t !== prev;
  }, [last], { timeout: 60000 });
  await page.waitForTimeout(700); // lascia finire il disegno dei canvas
  last = await loc.textContent();
  return last;
};
const shot = (name) => page.screenshot({ path: `/tmp/lab-${name}.png` });

await page.goto(url);
console.log('default      ', await stats()); await shot('1-default');

await page.getByLabel('Columns', { exact: false }).first().isVisible();
await page.getByRole('button', { name: '2', exact: true }).click();
await page.getByLabel('Sidebar background').check();
await page.getByLabel('Palette').selectOption('navy-grey');
await page.getByLabel('Heading font').selectOption('playfair-display');
await page.getByLabel('Body font').selectOption('source-sans-3');
console.log('2col navy    ', await stats()); await shot('2-twocol');

await page.getByLabel('Sample length').selectOption('8');
await page.getByLabel('CV language (section labels)').selectOption('de');
console.log('very long de ', await stats()); await shot('3-long');

await page.getByLabel('Palette').selectOption('gitfolio-dark');
console.log('dark land    ', await stats()); await shot('4-dark');
const n = await page.locator('canvas').count();
console.log('canvases', n);
for (let i = 0; i < Math.min(n, 3); i++) await page.locator('canvas').nth(i).screenshot({ path: `/tmp/lab-page-${i + 1}.png` });
console.log('errors:', errors);
await browser.close();
