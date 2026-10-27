// Upload CV con file reali: un .docx (italiano) e il PDF esportato dall'editor stesso (round trip).
// Uso: node scripts/serve-out.mjs 4174 (dopo npx next build), poi node scripts/upload-check.mjs 4174
import { chromium } from 'playwright';
const port = process.argv[2] ?? '4174';
import { tmpdir } from 'node:os';
const scratch = tmpdir();
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(`http://localhost:${port}/gitFolio/en/editor/`, { waitUntil: 'networkidle' });
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(500); return count(); };
let n = await settle(-1);

const upload = async (file) => {
  const fc = p.waitForEvent('filechooser');
  await p.getByRole('button', { name: 'Upload CV' }).click();
  await (await fc).setFiles(file);
  const t = p.locator('[role="status"], [role="alert"]').filter({ hasText: /Imported from your CV|could not|No CV sections/ }).first();
  await t.waitFor({ timeout: 20000 });
  const msg = await t.textContent();
  n = await settle(n);
  return msg;
};
const yamlOf = async () => {
  await p.getByRole('button', { name: 'YAML' }).click();
  const y = await p.getByLabel('CV as YAML').inputValue();
  await p.getByRole('button', { name: 'Form' }).click();
  return y;
};

// 1) DOCX
console.log('docx:', await upload('tests/fixtures/cv-sample-it.docx'));
let y = await yamlOf();
console.log(y.split('\n').slice(0, 60).join('\n'));
ok(y.includes('name: Marco Bianchi'), 'docx: name');
ok(y.includes('headline: Backend Engineer'), 'docx: headline');
ok(y.includes('email: marco.bianchi@example.com') && y.includes('linkedin: linkedin.com/in/marcob') && y.includes('phone: +39 345 678 9012'), 'docx: contacts');
ok(y.includes('role: Senior Backend Engineer') && y.includes('company: Globex S.r.l.') && y.includes('start: 2021-03') && y.includes('end: present'), 'docx: first experience');
ok(y.includes('role: Backend Engineer') && y.includes('company: Initech S.p.A.') && y.includes('start: 2017-06'), 'docx: second experience (company on its own line)');
ok(y.includes('degree: Laurea Magistrale in Informatica') && y.includes('school: Università di Roma La Sapienza'), 'docx: education');
ok(y.includes('group: Linguaggi') && y.includes('- Kotlin'), 'docx: skill groups');
ok(y.includes('name: Italiano') && y.includes('bar: 5') && y.includes('name: Inglese'), 'docx: languages');
ok(y.includes('name: AWS Solutions Architect Associate') && y.includes('issuer: Amazon') && y.includes('date: 2022-01'), 'docx: certification');
ok(y.includes('locale: it'), 'docx: Italian section titles detected');

// 2) PDF round trip: scarica il PDF del CV corrente, poi ricaricalo dopo "start over"
const dl = p.waitForEvent('download');
await p.getByRole('button', { name: 'Download PDF' }).click();
const pdfPath = `${scratch}/roundtrip.pdf`;
await (await dl).saveAs(pdfPath);
console.log('pdf:', await upload(pdfPath));
y = await yamlOf();
console.log(y.split('\n').slice(0, 40).join('\n'));
ok(y.includes('name: Marco Bianchi'), 'pdf: name');
ok(y.includes('role: Senior Backend Engineer') && y.includes('start: 2021-03'), 'pdf: experience with dates');
ok(y.includes('email: marco.bianchi@example.com'), 'pdf: email');
ok(/skills:\n/.test(y) && y.includes('Kubernetes'), 'pdf: skills');
console.log('errors:', errors);
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
