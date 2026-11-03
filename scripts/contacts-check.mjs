// Contatti nell'editor: data di nascita, scelta dell'icona per ogni contatto, suggerimenti di compilazione.
// Verifica anche il PDF vero: con l'icona disattivata la data porta davanti "Born", e ricaricando quel PDF la data viene riletta.
// Uso: node scripts/serve-out.mjs 4174 (dopo npx next build), poi node scripts/contacts-check.mjs 4174
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
const port = process.argv[2] ?? '4174';
const scratch = tmpdir();
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(`http://localhost:${port}/gitFolio/en/editor/`, { waitUntil: 'networkidle' });
const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(500); return count(); };
let n = await settle(-1);
const yamlOf = async () => {
  await p.getByRole('button', { name: 'YAML' }).click();
  const y = await p.getByLabel('CV as YAML').inputValue();
  await p.getByRole('button', { name: 'Form' }).click();
  return y;
};

// il selettore di icone si chiude quando si passa alla vista YAML e si torna: lo riapro quando serve
const openPicker = async (row, label) => {
  const g = row.getByRole('group', { name: `Icon for ${label}` });
  if (!(await g.count())) await row.getByRole('button', { name: `Change icon for ${label}` }).click();
  await g.waitFor();
  return g;
};

// apri la scheda Contacts
const card = p.locator('section', { has: p.locator('#card-contacts') }).first();
await card.getByRole('button', { name: /Contacts/ }).first().click();
await p.waitForTimeout(500);
const rows = card.locator('li');
ok((await rows.count()) === 6, 'six sample contacts listed');

// selettore di icone della prima riga (email)
const emailRow = rows.first();
await emailRow.getByRole('button', { name: 'Change icon for email' }).click();
const group = emailRow.getByRole('group', { name: 'Icon for email' });
await group.waitFor();
const choices = await group.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
console.log('   email icons:', choices.join(', '));
ok(choices.length === 7 && choices.includes('At sign') && choices.includes('No icon'), 'email offers 6 icons plus "No icon"');
ok((await group.getByRole('button', { name: 'Mail', exact: true }).getAttribute('aria-pressed')) === 'true', 'default icon is marked as selected');

// l'anteprima cambia quando si sceglie un'altra icona
const canvas = p.locator('canvas').first();
const before = await canvas.screenshot();
await group.getByRole('button', { name: 'At sign' }).click();
n = await settle(n);
const after = await canvas.screenshot();
ok(Buffer.compare(before, after) !== 0, 'the preview changed after choosing another email icon');
ok((await group.getByRole('button', { name: 'At sign' }).getAttribute('aria-pressed')) === 'true', 'chosen icon is marked as selected');
let y = await yamlOf();
ok(/email: lorem\.ipsum@example\.com\n\s+icon: at-sign/.test(y), 'the icon choice is part of the YAML');

// "No icon" e ritorno alla predefinita
const group2 = await openPicker(emailRow, 'email');
await group2.getByRole('button', { name: 'No icon' }).click();
n = await settle(n);
ok((await emailRow.getByRole('button', { name: 'Change icon for email' }).locator('svg.lucide-ban').count()) === 1, 'row button shows "no icon"');
await group2.getByRole('button', { name: 'Mail', exact: true }).click();
n = await settle(n);
y = await yamlOf();
ok(!/icon:/.test(y), 'choosing the default icon stores nothing');

// suggerimenti sul valore
const emailInput = emailRow.getByLabel('Email value');
ok((await emailInput.getAttribute('inputmode')) === 'email', 'email field asks for the email keyboard');
await emailInput.fill('not-an-email');
await p.waitForTimeout(200);
ok((await emailRow.getByText(/doesn't look like an email/).count()) === 1 && (await emailInput.getAttribute('aria-invalid')) === 'true', 'invalid email shows a hint');
await emailInput.fill('jane@example.com');
await p.waitForTimeout(200);
ok((await emailRow.getByText(/doesn't look like an email/).count()) === 0, 'hint disappears once the email is valid');
n = await settle(n);

// aggiunta: nel sample ci sono tutti i tipi, quindi la proposta è "Other link"; poi diventa Date of birth
await card.getByRole('button', { name: 'Add contact' }).click();
await p.waitForTimeout(300);
const last = card.locator('li').last();
ok((await last.getByLabel('Contact type').inputValue()) === 'link', 'new contact proposes the first missing kind');
ok(await last.getByLabel('Other link value').evaluate((e) => e === document.activeElement), 'new contact field has the focus');
await last.getByLabel('Contact type').selectOption('birthdate');
const date = last.getByLabel('Date of birth value');
ok((await date.getAttribute('type')) === 'date', 'date of birth uses a date field');
ok((await last.getByText(/Optional\. Many employers/).count()) === 1, 'date of birth shows the privacy hint');
await date.fill('1990-03-12');
n = await settle(n);
ok((await last.getByRole('button', { name: 'Change icon for date of birth' }).count()) === 1, 'date of birth has an icon picker');
y = await yamlOf();
ok(y.includes('birthdate: 1990-03-12'), 'YAML carries the date of birth');

// icona della data: scegli "Gift", poi "No icon" → il PDF scrive "Born March 12, 1990"
const gDob = await openPicker(last, 'date of birth');
await gDob.getByRole('button', { name: 'Gift' }).click();
n = await settle(n);
await gDob.getByRole('button', { name: 'No icon' }).click();
n = await settle(n);

// round trip: scarica il PDF, ricaricalo e controlla che la data di nascita torni
const dl = p.waitForEvent('download');
await p.getByRole('button', { name: 'Download PDF' }).click();
const pdfPath = `${scratch}/contacts-roundtrip.pdf`;
await (await dl).saveAs(pdfPath);
const fc = p.waitForEvent('filechooser');
await p.getByRole('button', { name: 'Upload CV' }).click();
await (await fc).setFiles(pdfPath);
await p.locator('[role="status"], [role="alert"]').filter({ hasText: /Imported from your CV|could not|No CV sections/ }).first().waitFor({ timeout: 30000 });
n = await settle(n);
y = await yamlOf();
console.log(y.split('\n').slice(0, 12).join('\n'));
ok(y.includes('birthdate: 1990-03-12'), 'PDF round trip: the date of birth is read back from "Born March 12, 1990"');
ok(!/phone: .*1990/.test(y), 'PDF round trip: the date is not mistaken for a phone number');

// bozza ricaricata: la scelta dell'icona sopravvive alla ricarica della pagina
await p.reload({ waitUntil: 'networkidle' });
await settle(-1);
const y2 = await yamlOf();
ok(y2.includes('birthdate: 1990-03-12'), 'the draft keeps the date of birth after a reload');

console.log('errors:', errors);
ok(errors.length === 0, 'no console errors');
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS');
process.exit(fails ? 1 : 0);
