// Verifica: bordo foto con spessore/colore, colonna laterale configurabile (sezioni, larghezza, altezza). Screenshot in /tmp.
import { chromium } from 'playwright';

const image = process.argv[2] ?? '/tmp/portrait-test.jpg';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 1300 } });
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto('http://localhost:4173/gitFolio/en/spike/');
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(700); return count(); };
let n = await settle(-1);
const tab = (name) => p.getByRole('tab', { name }).click();
const canvas = (name) => p.locator('canvas').first().screenshot({ path: `/tmp/lay-${name}.png` });
console.log('"Amount of content" present:', await p.getByText('Amount of content').count());

// foto + bordo
await tab('Photo'); await p.setInputFiles('[data-testid=photo-input]', image); n = await settle(n);
await p.getByLabel('Border thickness (0 = no border)').fill('6'); n = await settle(n);
await p.getByLabel('Border color HEX').fill('#C6F36B'); n = await settle(n);
await canvas('1-border');

// due colonne: Education -> Side, Skills -> Main
await tab('Layout'); await p.getByRole('button', { name: 'Two', exact: true }).click(); n = await settle(n);
const row = (name) => p.getByRole('group', { name, exact: true });
await row('Education').getByRole('button', { name: 'Side' }).click(); n = await settle(n);
await row('Skills').getByRole('button', { name: 'Main' }).click(); n = await settle(n);
await p.getByLabel('Colored background for the side column').check(); n = await settle(n);
await canvas('2-full');
await p.getByRole('button', { name: 'Fit content' }).click(); n = await settle(n); await canvas('3-content');
await p.getByRole('button', { name: 'Custom', exact: true }).click(); n = await settle(n);
await p.getByLabel('Height (% of the first page)').fill('50'); n = await settle(n); await canvas('4-custom50');
// contatti nella colonna principale
await row('Contacts').getByRole('button', { name: 'Main' }).click(); n = await settle(n); await canvas('5-contacts-main');
// tutto in main -> una sola colonna
for (const id of ['Education', 'Profile', 'Experience', 'Projects', 'Skills', 'Languages', 'Certifications']) await row(id).getByRole('button', { name: 'Main' }).click();
n = await settle(n); console.log('warn single column:', await p.getByText('stays on a single column').count()); await canvas('6-all-main');
console.log('errors:', errors); await b.close();
