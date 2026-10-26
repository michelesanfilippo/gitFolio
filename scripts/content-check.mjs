// Prova end-to-end della scheda Content: modifica, elimina, riordina, nascondi, rinomina, icone contatti, nuove sezioni.
// Legge il testo REALE del PDF (via pdf.js) per verificare che ogni modifica arrivi nel documento.
// Uso: node scripts/serve-out.mjs &  node scripts/content-check.mjs
import { chromium } from 'playwright';

const URL = 'http://localhost:4173/gitFolio/en/editor/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1100 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(URL);

const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
let n = -1;
const settle = async () => {
  await p.waitForFunction((k) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > k, n, { timeout: 30000 });
  await p.waitForTimeout(500); n = await count();
};
await settle();

const card = (title) => p.locator('button[aria-expanded]').filter({ hasText: new RegExp(`^${title}`) }).first();
const open = async (title) => { const c = card(title); if ((await c.getAttribute('aria-expanded')) !== 'true') await c.click(); };
const cardBox = (title) => p.locator('section').filter({ has: card(title) }).first();
const vis = (loc) => loc.filter({ visible: true });
const openId = async (id) => { const c = p.locator(`[aria-controls="card-${id}"]`); if ((await c.getAttribute('aria-expanded')) !== 'true') await c.click(); };
const click2 = async (loc) => { await loc.click(); await p.getByRole('button', { name: /^Confirm/ }).click(); }; // eliminazione a due passaggi

// testo reale del PDF
await open('Language & recruiter check');
await p.getByLabel(/Show the text a recruiter/).check();
const pdfText = async () => { await settle(); return (await p.locator('pre').first().textContent()).toLowerCase(); };
let t = await pdfText();

/* 1. navigazione: solo "Personal details" aperta */
ok('only Personal details is open at start', (await p.locator('button[aria-expanded=true]').count()) === 2 /* personal + tools appena aperta */);
await p.getByRole('button', { name: 'Collapse all sections' }).click();
ok('Collapse all closes every tab', (await p.locator('button[aria-expanded=true]').count()) === 0);
await p.getByRole('button', { name: 'Expand all sections' }).click();
ok('Expand all opens the section tabs', (await p.locator('button[aria-expanded=true]').count()) >= 10);
await p.getByRole('button', { name: 'Collapse all sections' }).click();

/* 2. dati personali */
await open('Personal details');
await vis(p.getByLabel('Full name')).fill('Ada Test-Name');
await vis(p.getByLabel('Professional title')).fill('Principal Engineer');
t = await pdfText();
ok('name and title are editable', t.includes('ada test-name') && t.includes('principal engineer') && !t.includes('lorem ipsum\n'));

/* 3. contatti: modifica, nascondi, aggiungi, elimina, icone */
await open('Contacts');
await p.getByLabel('Email value').fill('ada@test.dev');
await p.getByRole('button', { name: 'Hide phone from the CV' }).click();
await p.getByRole('button', { name: 'Add contact' }).click();
await p.getByLabel('Other link value').fill('portfolio.test/ada');
await click2(p.getByRole('button', { name: 'Delete github' }));
t = await pdfText();
ok('contact edited', t.includes('ada@test.dev'));
ok('hidden contact is not in the PDF', !t.includes('+00 000'));
ok('added contact appears (URL shown without protocol)', t.includes('portfolio.test/ada'));
ok('deleted contact is gone', !t.includes('github.com/your-name'));
const shot = async (name, loc) => (loc ?? p.locator('canvas').first()).screenshot({ path: `/tmp/cc-${name}.png` });
await shot('icons-auto');
await p.getByRole('group', { name: 'Icon color' }).getByRole('button', { name: 'Main' }).click(); await settle();
await shot('icons-main');
await p.getByLabel('Show an icon before each contact').uncheck(); await settle();
ok('icons can be turned off', (await p.getByRole('group', { name: 'Icon color' }).count()) === 0);
await p.getByLabel('Show an icon before each contact').check(); await settle();

/* 4. esperienze: modifica, aggiungi, riordina, elimina */
await open('Experience');
await openId('exp-exp-1');
await vis(p.getByLabel('Job title')).first().fill('Principal Tester');
await p.getByRole('button', { name: 'Add experience' }).click();
await vis(p.getByLabel('Job title')).last().fill('Intern Tester');
await vis(p.getByLabel('Company')).last().fill('Testing Co');
await p.getByRole('button', { name: 'Move experience up' }).last().click();
await p.getByRole('button', { name: 'Move experience up' }).nth(1).click();
t = await pdfText();
ok('experience edited + added', t.includes('principal tester') && t.includes('intern tester') && t.includes('testing co'));
ok('experience reordered (new entry first)', t.indexOf('intern tester') < t.indexOf('principal tester'));
await click2(p.getByRole('button', { name: 'Delete experience' }).last());
t = await pdfText();
ok('experience deleted', !t.includes('consectetur role') && t.includes('principal tester'));

/* 5. competenze e lingue */
await open('Skills');
await openId('skg-s1');
await vis(p.getByLabel('Group name')).first().fill('Core');
await vis(p.getByRole('button', { name: 'Add skill', exact: true })).first().click();
await vis(p.getByLabel('Skill name')).last().fill('Testing');
await open('Languages');
await p.getByRole('button', { name: 'Add language' }).click();
await vis(p.getByLabel('Language', { exact: true })).last().fill('Klingon');
await vis(p.getByLabel('Level', { exact: true })).last().fill('C1');
t = await pdfText();
ok('skills group + skill + language editable', t.includes('core') && t.includes('testing') && t.includes('klingon'));

/* 6. rinomina, nascondi, riordina sezioni (1 colonna: un solo flusso) */
await open('Education');
await cardBox('Education').getByLabel('Section title').fill('Studies');
await cardBox('Projects').getByRole('button', { name: 'Hide section from the CV' }).click();
await cardBox('Languages').getByRole('button', { name: 'Move section up' }).click();
await cardBox('Languages').getByRole('button', { name: 'Move section up' }).click();
t = await pdfText();
ok('section renamed', t.includes('studies') && !t.includes('education\n'));
ok('hidden section is not in the PDF', !t.includes('lorem ipsum project'));
ok('section moved up (Languages before Skills)', t.indexOf('languages') > -1 && t.indexOf('languages') < t.indexOf('skills'));

/* 7. nuova sezione nella colonna laterale, sopra "Skills" (serve il layout a 2 colonne) */
await p.getByRole('tab', { name: 'Layout' }).click();
await p.getByRole('button', { name: 'Two', exact: true }).click(); await settle();
await p.getByRole('tab', { name: 'Content' }).click();
await open('Add a new section');
await vis(p.getByLabel('Section title')).last().fill('Volunteering');
await p.getByRole('textbox', { name: 'New section text' }).click();
await p.keyboard.type('Helped people learn');
await p.getByRole('group', { name: 'Where' }).getByRole('button', { name: 'Side column' }).click();
await vis(p.locator('label', { hasText: /^Position/ }).locator('select')).selectOption({ label: 'Skills' });
await p.getByRole('group', { name: 'Relative to that section' }).getByRole('button', { name: 'Above it' }).click();
await p.getByRole('button', { name: 'Add section', exact: true }).click();
t = await pdfText();
ok('new custom section appears with its text', t.includes('volunteering') && t.includes('helped people learn'));
ok('placed above Skills', t.indexOf('volunteering') < t.indexOf('skills'));
await shot('two-col-custom');
ok('custom section card exists', (await card('Volunteering').count()) === 1);

/* 8. elimina la sezione personalizzata */
await open('Volunteering');
await click2(cardBox('Volunteering').getByRole('button', { name: 'Delete section' }));
t = await pdfText();
ok('custom section deleted', !t.includes('volunteering') && (await card('Volunteering').count()) === 0);

console.log('console/page errors:', errors);
if (errors.length) process.exitCode = 1;
await b.close();
