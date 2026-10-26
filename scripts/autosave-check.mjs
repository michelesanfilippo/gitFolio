// Salvataggio automatico locale: ripristino dopo ricarica, preset che cambia solo il design, "Start over", slot corrotto.
import { chromium } from 'playwright';
const URL = 'http://localhost:4173/gitFolio/en/editor/';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const name = () => p.getByLabel('Full name').filter({ visible: true }).inputValue();
const slots = () => p.evaluate(() => ['a', 'b'].map((k) => localStorage.getItem(`gitfolio:draft:${k}`)));

await p.goto(URL); await p.waitForTimeout(2500);
ok('fresh visitor: nothing is stored', (await slots()).every((x) => x === null));

await p.getByLabel('Full name').filter({ visible: true }).fill('Persisted Person');
await p.getByRole('tab', { name: 'Colors' }).click();
await p.getByRole('button', { name: 'Bordeaux' }).click();
await p.waitForTimeout(1500);
ok('autosave note appears', (await p.getByText('Draft saved on this device').count()) === 1);
ok('draft written to storage', (await slots()).some((x) => x && x.includes('Persisted Person')));

await p.reload(); await p.waitForTimeout(2800);
ok('reload restores the content', (await name()) === 'Persisted Person');
ok('reload shows the restore notice', (await p.getByText('Restored your last draft').count()) === 1);
await p.getByRole('tab', { name: 'Colors' }).click();
ok('reload restores the palette', (await p.getByRole('button', { name: 'Bordeaux', pressed: true }).count()) === 1);

// preset: cambia il design, non i contenuti
await p.goto(URL + '?preset=midnight'); await p.waitForTimeout(2800);
ok('preset keeps the typed content', (await name()) === 'Persisted Person');
await p.getByRole('tab', { name: 'Colors' }).click();
ok('preset applies its design (dark palette)', (await p.getByRole('button', { name: 'gitFolio dark', pressed: true }).count()) === 1);

// uno slot corrotto non rompe nulla né cancella la copia valida
await p.evaluate(() => { const k = ['a', 'b'].find((x) => (localStorage.getItem(`gitfolio:draft:${x}`) ?? '').includes('Persisted')); localStorage.setItem(`gitfolio:draft:${k === 'a' ? 'b' : 'a'}`, '{broken'); });
await p.goto(URL); await p.waitForTimeout(2800);
ok('a corrupted slot is ignored, valid draft still restored', (await name()) === 'Persisted Person');

// Start over
await p.locator('button[aria-expanded]').filter({ hasText: /^Your draft/ }).first().click();
await p.getByRole('button', { name: 'Start over with the placeholder CV' }).click();
await p.getByRole('button', { name: /^Confirm/ }).click();
await p.waitForTimeout(1200);
ok('Start over restores the placeholder', (await name()) === 'Lorem Ipsum');
ok('Start over clears the stored draft', (await slots()).every((x) => x === null));
await p.reload(); await p.waitForTimeout(2500);
ok('after Start over a reload stays at the placeholder', (await name()) === 'Lorem Ipsum');

console.log('console/page errors:', errors);
if (errors.length) process.exitCode = 1;
await b.close();
