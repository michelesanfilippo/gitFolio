// Fotografa il sito vero (build servita in locale) a 1920x1080 per il video di lancio: landing, editor (Content, dopo "Upload CV",
// YAML, Style) e anteprima PDF ingrandita. Le immagini finiscono in video/assets/screens/.
// Uso: node scripts/serve-out.mjs 4174 (dopo npx next build), poi node scripts/video-screens.mjs 4174
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const port = process.argv[2] ?? '4174';
const dir = 'video/assets/screens';
mkdirSync(dir, { recursive: true });
const base = `http://localhost:${port}/gitFolio/en`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); // movimento normale: le attese sotto lasciano finire le entrate
const p = await ctx.newPage();
const shot = (name) => p.screenshot({ path: `${dir}/${name}.png` }).then(() => console.log(name));

await p.goto(`${base}/`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1800);
await shot('landing');

await p.goto(`${base}/editor/?preset=lime-classic`, { waitUntil: 'networkidle' });
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(400); return count(); };
let n = await settle(-1);
await shot('editor-content');

// CV reale importato dal file di prova (.docx): il toast di conferma resta nello scatto
await p.getByRole('button', { name: 'Upload CV' }).click({ trial: true });
const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: 'Upload CV' }).click()]);
await chooser.setFiles('tests/fixtures/cv-sample-it.docx');
await p.getByRole('status').filter({ hasText: 'Imported' }).waitFor({ timeout: 20000 }).catch(() => {});
n = await settle(n);
await shot('editor-upload');

await p.getByRole('button', { name: 'YAML' }).click();
await p.getByLabel('CV as YAML').waitFor();
await p.waitForTimeout(400);
await shot('editor-yaml');
await p.getByRole('button', { name: 'Form' }).click();

await p.getByRole('tab', { name: 'Style' }).click();
await p.waitForTimeout(500);
await shot('editor-style');

// anteprima grande: zoom al massimo
const slider = p.getByRole('slider', { name: 'Zoom' });
await slider.focus();
for (let i = 0; i < 20; i++) await p.keyboard.press('ArrowRight');
await p.waitForTimeout(600);
await shot('editor-preview');

await b.close();
