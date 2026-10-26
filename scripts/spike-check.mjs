import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/gitFolio/it/spike/';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
page.on('requestfailed', (r) => errors.push(`reqfail ${r.url()}`));
await page.goto(url);
await page.getByRole('button').click();
await page.getByText(/pages:/).waitFor({ timeout: 60000 });
console.log(await page.getByText(/pages:/).textContent());
console.log((await page.locator('pre').textContent()).slice(0, 300));
console.log('errors:', errors);
await browser.close();
