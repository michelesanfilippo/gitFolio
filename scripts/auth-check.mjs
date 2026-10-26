// Test end-to-end del flusso account con un Supabase FINTO (intercetta le richieste di rete con Playwright).
// Verifica UI e logica client; NON verifica le regole RLS del database vero (vedi docs/supabase/schema.sql).
// Uso:
//   NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=mock pnpm build
//   node scripts/serve-out.mjs &  node scripts/auth-check.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173/gitFolio';
const HOST = 'https://mock.supabase.co';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (email) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', aud: 'authenticated', role: 'authenticated', email, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;

// --- backend finto in memoria
const db = { profile: { id: 'u1', username: 'ada', default_photo: null }, templates: [] };
let seq = 0;
const user = (email) => ({ id: 'u1', aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (route, status, body) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });

async function mock(page) {
  await page.route(`${HOST}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const body = req.postData() ? JSON.parse(req.postData()) : undefined;

    if (path === '/auth/v1/token') {
      if (body.password === 'wrongpass') return json(route, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      const email = body.email ?? 'ada@example.com';
      return json(route, 200, { access_token: jwt(email), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r1', user: user(email) });
    }
    if (path === '/auth/v1/signup') return json(route, 200, user(body.email)); // conferma email richiesta: nessuna sessione
    if (path === '/auth/v1/user') return json(route, 200, user('ada@example.com'));
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors });

    if (path === '/rest/v1/profiles') {
      if (req.method() === 'PATCH') { Object.assign(db.profile, body); return json(route, 200, db.profile); }
      if (req.method() === 'POST') return json(route, 201, db.profile);
      return json(route, 200, db.profile);
    }
    if (path === '/rest/v1/templates') {
      const id = url.searchParams.get('id')?.replace('eq.', '');
      const sel = url.searchParams.get('select') ?? '';
      const pick = (t) => (sel.includes('data') ? t : { id: t.id, name: t.name, thumbnail: t.thumbnail, updated_at: t.updated_at });
      if (req.method() === 'GET') {
        if (id) { const t = db.templates.find((x) => x.id === id); return t ? json(route, 200, pick(t)) : json(route, 406, { code: 'PGRST116', message: 'not found' }); }
        return json(route, 200, [...db.templates].reverse().map(pick));
      }
      if (req.method() === 'POST') {
        if (db.templates.length >= 5) return json(route, 400, { code: 'P0001', message: 'template_limit', details: null, hint: 'Delete a saved template first' });
        const t = { id: `t${++seq}`, name: body.name, data: body.data, thumbnail: body.thumbnail, updated_at: new Date().toISOString() };
        db.templates.push(t);
        return json(route, 201, single ? pick(t) : [pick(t)]);
      }
      if (req.method() === 'PATCH') {
        const t = db.templates.find((x) => x.id === id); Object.assign(t, body, { updated_at: new Date().toISOString() });
        return json(route, 200, single ? pick(t) : [pick(t)]);
      }
      if (req.method() === 'DELETE') { db.templates = db.templates.filter((x) => x.id !== id); return route.fulfill({ status: 204, headers: cors }); }
    }
    return json(route, 404, { message: `unmocked ${req.method()} ${path}` });
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
await mock(page);

const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };
const count = () => page.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
const settle = async (prev) => { await page.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await page.waitForTimeout(500); return count(); };
const headerButtons = () => page.locator('header').locator('button, a').allInnerTexts().then((t) => t.map((x) => x.trim()).filter(Boolean));

// 1) disconnesso: Login prima di GitHub
await page.goto(`${BASE}/en/`);
await page.waitForTimeout(800);
let hb = await headerButtons();
ok('logged out header: Login then GitHub', hb.join('|').includes('Login') && hb.indexOf('Login') < hb.findIndex((t) => /star/.test(t)));
ok('no "account" wording on landing', (await page.getByText('no account').count()) === 0);
ok('tagline replaced', (await page.getByText('Your career, your way.').count()) === 1);

// 2) login errato / corretto
await page.getByRole('button', { name: 'Login' }).click();
const dlg = page.getByRole('dialog');
await dlg.getByLabel('Email').fill('ada@example.com');
await dlg.getByLabel('Password').fill('wrongpass');
await dlg.getByRole('button', { name: 'Log in', exact: true }).click();
await page.waitForTimeout(600);
ok('wrong password shows a friendly error', (await dlg.getByRole('alert').textContent())?.includes('Wrong email or password'));
await dlg.getByLabel('Password').fill('correct-horse');
await dlg.getByRole('button', { name: 'Log in', exact: true }).click();
await page.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 10000 });
await page.waitForTimeout(500);
hb = await headerButtons();
const iL = hb.findIndex((t) => /Logout/.test(t)), iD = hb.findIndex((t) => /Dashboard/.test(t)), iG = hb.findIndex((t) => /star/.test(t));
ok('logged in header order: Logout < Dashboard < GitHub', iL >= 0 && iL < iD && iD < iG);
ok('Login button gone', !hb.includes('Login'));

// 3) registrazione (email di conferma)
// (si prova da disconnessi più sotto)

// 4) editor: Save template a sinistra di Download PDF
await page.goto(`${BASE}/en/editor/`);
let n = await settle(-1);
const names = await page.locator('section[aria-label=Preview] button').allInnerTexts();
const iS = names.findIndex((t) => /Save template/.test(t)), iDl = names.findIndex((t) => /Download PDF/.test(t));
ok('Save template is left of Download PDF', iS >= 0 && iS < iDl);

// salva 1: palette Bordeaux
await page.getByRole('tab', { name: 'Colors' }).click();
await page.getByRole('button', { name: 'Bordeaux' }).click(); n = await settle(n);
await page.getByRole('button', { name: 'Save template' }).click();
await page.getByRole('dialog').getByLabel('Name').fill('Bordeaux CV');
await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(800);
ok('template created', db.templates.length === 1 && db.templates[0].name === 'Bordeaux CV');
ok('thumbnail captured', String(db.templates[0].thumbnail).startsWith('data:image/jpeg;base64,'));
ok('URL now carries ?t=', page.url().includes('?t=t1'));
ok('saved data has bordeaux palette + schema version', db.templates[0].data.v === 1 && db.templates[0].data.design.paletteId === 'bordeaux');

// aggiornamento (stesso template): cambia palette e risalva senza nuovo dialog
await page.getByRole('button', { name: 'Forest green' }).click(); n = await settle(n);
await page.getByRole('button', { name: 'Save template' }).click();
await page.waitForTimeout(800);
ok('second save updates the same template', db.templates.length === 1 && db.templates[0].data.design.paletteId === 'forest');

// 5) limite 5: riempi fino a 5 poi prova il 6°
for (const nm of ['B', 'C', 'D', 'E']) {
  await page.goto(`${BASE}/en/editor/`); n = await settle(-1);
  await page.getByRole('button', { name: 'Save template' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`CV ${nm}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(600);
}
ok('five templates saved', db.templates.length === 5);
await page.goto(`${BASE}/en/editor/`); n = await settle(-1);
await page.getByRole('button', { name: 'Save template' }).click();
await page.waitForTimeout(600);
ok('6th save asks to delete one', (await page.getByRole('dialog').getByText('That is the limit').count()) === 1);
const victim = db.templates[1].name;
const row = page.getByRole('dialog').locator('li', { hasText: victim });
await row.getByRole('button').click();             // arma
ok('delete needs a second click', db.templates.length === 5);
await row.getByRole('button', { name: /Click again/ }).click(); // conferma
await page.waitForTimeout(800);
ok('after deleting, the name dialog opens', (await page.getByRole('dialog').getByLabel('Name').count()) === 1 && db.templates.length === 4);
await page.getByRole('dialog').getByLabel('Name').fill('Sixth');
await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
await page.waitForTimeout(800);
ok('sixth saved after making room', db.templates.length === 5 && db.templates.some((t) => t.name === 'Sixth'));

// 6) Dashboard
await page.getByRole('link', { name: 'Dashboard' }).click();
await page.waitForURL(/dashboard/);
await page.waitForTimeout(1000);
ok('dashboard lists 5 of 5, no "New CV" button', (await page.getByText('5 of 5 saved').count()) === 1 && (await page.getByRole('link', { name: 'New CV' }).count()) === 0);
ok('account info: email + username', (await page.getByText('ada@example.com').count()) >= 1 && (await page.getByLabel('Username').inputValue()) === 'ada');
await page.screenshot({ path: '/tmp/dash-1.png' });

// 7) riprende un template e verifica che lo stato sia ripristinato
await page.getByRole('link', { name: 'Open Bordeaux CV' }).click();
await page.waitForURL(/editor\/\?t=/);
n = await settle(-1);
await page.getByRole('tab', { name: 'Colors' }).click();
ok('opening a saved template restores its palette (forest)', (await page.getByRole('button', { name: 'Forest green', pressed: true }).count()) === 1);

// 8) username + foto predefinita
await page.goto(`${BASE}/en/dashboard/`); await page.waitForTimeout(800);
await page.getByLabel('Username').fill('Ada Lovelace');
await page.getByRole('button', { name: 'Save username' }).click();
await page.waitForTimeout(500);
ok('username saved', db.profile.username === 'Ada Lovelace');
await page.setInputFiles('[data-testid=photo-input]', 'scripts/assets/avatar.jpg');
await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Save as default' }).click();
await page.waitForTimeout(500);
ok('default photo saved', String(db.profile.default_photo).startsWith('data:image/jpeg;base64,'));

// nuovo CV: la foto predefinita viene applicata
await page.goto(`${BASE}/en/editor/`); n = await settle(-1);
await page.waitForTimeout(800);
await page.getByRole('tab', { name: 'Photo' }).click();
ok('new CV starts with the default photo', (await page.getByText('Change photo').count()) === 1);

// 9) eliminazione da dashboard (con conferma)
await page.goto(`${BASE}/en/dashboard/`); await page.waitForTimeout(800);
await page.getByRole('button', { name: /^Delete CV C$/ }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
await page.waitForTimeout(800);
ok('delete from dashboard works and frees a slot', db.templates.length === 4 && (await page.getByRole('link', { name: 'New CV' }).count()) === 1);

// 10) logout
await page.getByRole('button', { name: 'Logout' }).click();
await page.waitForTimeout(800);
hb = await headerButtons();
ok('logout returns the Login button', hb.includes('Login') && !hb.some((t) => /Dashboard|Logout/.test(t)));
await page.goto(`${BASE}/en/editor/?t=t1`); await page.waitForTimeout(1000);
ok('?t= while logged out prompts to log in', (await page.getByText('Log in to open your saved template').count()) === 1);

// 11) registrazione con conferma email
await page.getByRole('button', { name: 'Login' }).first().click();
await page.getByRole('dialog').getByRole('button', { name: 'Register now' }).first().click();
await page.getByRole('dialog').getByLabel('Email').fill('new@example.com');
await page.getByRole('dialog').getByLabel('Password').fill('averylongpass');
await page.getByRole('dialog').getByRole('button', { name: 'Register now' }).last().click();
await page.waitForTimeout(800);
ok('sign-up shows the "check your inbox" state', (await page.getByRole('dialog').getByText('Check your inbox').count()) >= 1);

console.log('console/page errors:', errors);
if (errors.length) process.exitCode = 1;
await browser.close();
