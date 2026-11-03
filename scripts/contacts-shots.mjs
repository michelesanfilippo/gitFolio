// Schermate di controllo della scheda Contacts (selettore di icone, data di nascita) e del PDF risultante.
// Uso: node scripts/serve-out.mjs 4174, poi node scripts/contacts-shots.mjs 4174 [cartella]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const port = process.argv[2] ?? '4174';
const out = process.argv[3] ?? join(tmpdir(), 'gitfolio-contacts');
mkdirSync(out, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
await p.goto(`http://localhost:${port}/gitFolio/en/editor/`, { waitUntil: 'networkidle' });
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(500); return Number(await p.locator('section[data-render-count]').getAttribute('data-render-count')); };
let n = await settle(-1);

const card = p.locator('section', { has: p.locator('#card-contacts') }).first();
await card.getByRole('button', { name: /Contacts/ }).first().click();
await p.waitForTimeout(400);
const pick = async (row, label, icon) => {
  const g = row.getByRole('group', { name: `Icon for ${label}` });
  if (!(await g.count())) await row.getByRole('button', { name: `Change icon for ${label}` }).click();
  await g.getByRole('button', { name: icon, exact: true }).click();
  n = await settle(n);
};
const rows = card.locator('li');
await pick(rows.nth(0), 'email', 'At sign');
await pick(rows.nth(1), 'phone', 'Smartphone');
await pick(rows.nth(2), 'location', 'House');
await pick(rows.nth(3), 'website', 'Laptop');
await pick(rows.nth(4), 'linkedin', 'Briefcase');
await pick(rows.nth(5), 'github', 'Terminal');
await card.getByRole('button', { name: 'Add contact' }).click();
const last = card.locator('li').last();
await last.getByLabel('Contact type').selectOption('birthdate');
await last.getByLabel('Date of birth value').fill('1990-03-12');
n = await settle(n);
await last.getByRole('button', { name: 'Change icon for date of birth' }).click();
await rows.nth(0).getByRole('button', { name: 'Change icon for email' }).click();
await p.waitForTimeout(300);
await card.scrollIntoViewIfNeeded();
await p.screenshot({ path: join(out, 'editor-contacts.png') });

// anteprima ingrandita dell'intestazione
const slider = p.getByRole('slider', { name: 'Zoom' });
await slider.focus();
for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowRight');
await p.waitForTimeout(700);
await p.locator('canvas').first().screenshot({ path: join(out, 'pdf-header.png'), clip: undefined });
await p.screenshot({ path: join(out, 'editor-preview.png') });
console.log(out);
await b.close();
