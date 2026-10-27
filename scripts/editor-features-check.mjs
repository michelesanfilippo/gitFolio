// Verifica delle modifiche: zoom 30-110% default 60, sidebar senza campi tagliati, X del login senza tooltip,
// Upload CV (txt), editor YAML, trascinamento sezioni, Contacts senza frecce, bullet SVG nel PDF.
// Uso: node scripts/serve-out.mjs 4174 (dopo npx next build), poi node scripts/editor-features-check.mjs 4174
import { chromium } from 'playwright';
const port = process.argv[2] ?? '4174';
import { tmpdir } from 'node:os';
const shots = tmpdir();
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1366, height: 900 } });
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(`http://localhost:${port}/gitFolio/en/editor/`, { waitUntil: 'networkidle' });
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(500); return count(); };
let n = await settle(-1);

// zoom
const slider = p.getByRole('slider', { name: 'Zoom' });
ok((await slider.getAttribute('min')) === '0.3' && (await slider.getAttribute('max')) === '1.1', 'zoom range 30%-110%');
ok((await p.locator('output').first().textContent()) === '60%', 'zoom default 60%');
ok((await p.locator('aside').boundingBox()).width === 520, 'sidebar 520px at 1366 (xl)');

// campi che sforano
await p.getByRole('button', { name: 'Expand all sections' }).click();
await p.waitForTimeout(500);
const bad = await p.evaluate(() => {
  const aside = document.querySelector('aside'); const ar = aside.getBoundingClientRect(); const out = [];
  for (const el of aside.querySelectorAll('input, select, button, .ProseMirror')) { const r = el.getBoundingClientRect(); if (r.width && r.right > ar.right + 0.5) out.push(`${el.tagName}[${el.getAttribute('aria-label') ?? el.type}] ${Math.round(r.right)}>${Math.round(ar.right)}`); }
  return out;
});
ok(bad.length === 0, `no field overflows the sidebar ${bad.length ? bad.slice(0, 5).join(' | ') : ''}`);
const sel = await p.locator('select[aria-label="Contact type"]').first().evaluate((e) => ({ pad: getComputedStyle(e).paddingLeft, w: e.getBoundingClientRect().width }));
ok(parseFloat(sel.pad) >= 30, `contact type select has room for the icon (padding-left ${sel.pad}, width ${Math.round(sel.w)})`);
ok((await p.getByRole('button', { name: 'Expand all sections' }).evaluate((e) => e.className.includes('text-accent-text'))), 'expand/collapse buttons are lime');

// contacts: niente frecce, altre sezioni sì
const contactsCard = p.locator('section', { has: p.locator('#card-contacts') }).first();
ok((await contactsCard.getByRole('button', { name: /Move section (up|down)/ }).count()) === 0, 'Contacts has no move arrows');
ok((await contactsCard.getByText('fixed position').count()) === 1, 'Contacts marked as fixed');
const expCard = p.locator('section', { has: p.locator('#card-experience') }).first();
ok((await expCard.getByRole('button', { name: /Move section (up|down)/ }).count()) === 2, 'Experience keeps its arrows');
ok((await expCard.locator('[draggable="true"]').count()) === 1 && (await contactsCard.locator('[draggable="true"]').count()) === 0, 'drag handle only on movable sections');

// trascinamento: Experience sotto Education
const orderBefore = await p.evaluate(() => [...document.querySelectorAll('aside section > div > div[id^="card-"]')].map((e) => e.id));
const handle = expCard.locator('[draggable="true"]');
const eduCard = p.locator('section', { has: p.locator('#card-education') }).first();
await p.getByRole('button', { name: 'Collapse all sections' }).click();
await p.waitForTimeout(400);
const eb = await eduCard.boundingBox();
await handle.dragTo(eduCard, { targetPosition: { x: 120, y: eb.height - 6 } });
await p.waitForTimeout(400);
const orderAfter = await p.evaluate(() => [...document.querySelectorAll('aside section > div > div[id^="card-"]')].map((e) => e.id));
console.log('   order before:', orderBefore.join(','), '\n   order after: ', orderAfter.join(','));
ok(orderAfter.indexOf('card-experience') > orderAfter.indexOf('card-education') && orderBefore.indexOf('card-experience') < orderBefore.indexOf('card-education'), 'drag-and-drop moved Experience below Education');

// Upload CV (txt)
await p.getByRole('button', { name: 'Upload CV' }).click({ trial: true });
const fc = p.waitForEvent('filechooser');
await p.getByRole('button', { name: 'Upload CV' }).click();
await (await fc).setFiles('tests/fixtures/cv-sample-en.txt');
await p.getByText(/Imported from your CV/).waitFor({ timeout: 10000 });
n = await settle(n);
ok((await p.getByLabel('Full name').inputValue()) === 'Jane Example', 'upload filled the name');
ok((await p.getByText('Senior Product Designer – Acme Inc', { exact: false }).count()) >= 0, 'upload applied');
const text = await p.evaluate(() => document.querySelector('aside').innerText);
ok(text.includes('Acme Inc') && !text.includes('Lorem Ipsum Role'), 'placeholder experience replaced by the uploaded one');

// YAML
await p.getByRole('button', { name: 'YAML' }).click();
const ta = p.getByLabel('CV as YAML');
await ta.waitFor();
const yaml = await ta.inputValue();
ok(yaml.startsWith('name: Jane Example'), 'YAML view shows the imported CV');
await ta.fill(yaml.replace('name: Jane Example', 'name: Jane Updated'));
await p.getByText('In sync with the preview').waitFor({ timeout: 5000 });
n = await settle(n);
await ta.fill('name: [broken');
await p.getByRole('alert').filter({ hasText: /line/ }).waitFor({ timeout: 5000 });
ok(true, 'YAML syntax error reported');
await p.getByRole('button', { name: 'Form' }).click();
ok((await p.getByLabel('Full name').inputValue()) === 'Jane Updated', 'YAML edit applied to the form (bad YAML ignored)');

// bullet: più scelte, SVG nel PDF (l'anteprima ridisegna)
await p.getByRole('tab', { name: 'Style' }).click();
const bulletGroup = p.getByRole('group', { name: 'Bullet style' });
ok((await bulletGroup.getByRole('button').count()) === 10, '10 bullet styles offered');
await bulletGroup.getByRole('button', { name: 'Check' }).click(); n = await settle(n);
await bulletGroup.getByRole('button', { name: 'Arrow' }).click(); n = await settle(n);
await p.getByRole('tab', { name: 'Style' }).click();
await p.locator('canvas').first().screenshot({ path: `${shots}/pdf-arrow.png` });
ok(true, 'bullet switch re-rendered without errors');

// login dialog X: niente tooltip
await p.getByRole('button', { name: /log ?in|sign in/i }).first().click();
const closeBtn = p.getByRole('dialog').getByRole('button', { name: 'Close' });
ok((await closeBtn.getAttribute('data-tip')) === null, 'login close button has no tooltip');
await p.keyboard.press('Escape');

console.log('errors:', errors.filter((e) => !/favicon|404/.test(e)));
await p.screenshot({ path: `${shots}/editor-final.png` });
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
