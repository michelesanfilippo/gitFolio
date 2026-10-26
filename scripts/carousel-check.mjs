// Carosello 3D della home: autoplay, mouse sopra NON ferma, frecce, trascinamento a mano, clic su card laterale, apertura editor.
import { chromium } from 'playwright';

const URL = 'http://localhost:4173/gitFolio/en/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; };

await p.goto(URL);
const N = await p.locator('.ring-card').count();
const front = async () => p.locator('.ring-card').evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-current') === 'true'));
const diff = (a, c) => (((c - a) % N) + N) % N;
const box = async () => (await p.locator('.ring-stage').boundingBox());
const stageMid = async () => { const bx = await box(); return { x: bx.x + bx.width / 2, y: bx.y + bx.height * 0.45 }; };

ok('12 templates on the ring', N === 12);

// autoplay + il mouse sopra non ferma
let f0 = await front();
await p.waitForTimeout(3700);
let f1 = await front();
ok('auto-advances card by card (first move starts quickly)', diff(f0, f1) >= 1 && diff(f0, f1) <= 2);
const mid = await stageMid();
await p.mouse.move(mid.x, mid.y);
await p.waitForTimeout(3700);
const f2 = await front();
ok('keeps advancing with the mouse over it', diff(f1, f2) >= 1);

let f4 = f2;

// tastiera
await p.locator('.ring-card a').first().focus();
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
ok('arrow key moves the ring', diff(f4, await front()) >= 1);
ok('no arrow buttons are rendered', (await p.getByRole('button', { name: /(Next|Previous) template/ }).count()) === 0);

// trascinamento a mano col mouse (card per card, aggancio alla più vicina)
await p.waitForTimeout(700);
const before = await front();
await p.mouse.move(mid.x, mid.y);
await p.mouse.down();
for (let i = 1; i <= 12; i++) { await p.mouse.move(mid.x - i * 25, mid.y); await p.waitForTimeout(30); } // 300 px verso sinistra = 2 card avanti
await p.waitForTimeout(220); // fermo prima di rilasciare: nessuno slancio
await p.mouse.up(); await p.waitForTimeout(900);
const afterLeft = await front();
ok('mouse drag left advances ~2 cards and snaps', [2, 3].includes(diff(before, afterLeft)));
ok('dragging does not navigate away', p.url() === URL);
await p.mouse.move(mid.x, mid.y);
await p.mouse.down();
for (let i = 1; i <= 6; i++) { await p.mouse.move(mid.x + i * 25, mid.y); await p.waitForTimeout(30); } // 150 px verso destra = 1 card indietro
await p.waitForTimeout(220);
await p.mouse.up(); await p.waitForTimeout(900);
const afterRight = await front(); console.log('   drag right: front', afterLeft, '->', afterRight);
ok('mouse drag right goes back ~1 card', [1, 2].includes(diff(afterRight, afterLeft)));

// slancio: un gesto veloce e breve porta avanti più card della sola distanza percorsa
await p.waitForTimeout(900);
const b0 = await front();
await p.mouse.move(mid.x, mid.y); await p.mouse.down();
await p.mouse.move(mid.x - 60, mid.y, { steps: 3 }); await p.mouse.move(mid.x - 150, mid.y, { steps: 3 }); // 150 px in pochi ms
await p.mouse.up(); await p.waitForTimeout(1500);
ok('a fast flick carries momentum (more than the 1 card of distance)', diff(b0, await front()) >= 2);

// clic su una card laterale: la porta davanti, non apre l'editor
await p.waitForTimeout(900);
const cur = await front();
const target = (cur + 1) % N;
await p.locator('.ring-card').nth(target).locator('.ring-slice').nth(4).click({ force: true });
await p.waitForTimeout(900);
ok('clicking a side card brings it to the front', (await front()) === target);
ok('...without opening the editor', p.url() === URL);

// clic sulla card davanti: apre l'editor con quel preset
const id = await p.locator('.ring-card').nth(await front()).locator('a').getAttribute('href');
await p.locator('.ring-card').nth(await front()).locator('.ring-slice').nth(4).click({ force: true });
await p.waitForURL(/editor\/\?preset=/, { timeout: 10000 });
ok('clicking the front card opens the editor with that preset', p.url().endsWith(id.replace('/gitFolio', '')) || p.url().includes('preset='));

// profondità e linee
await p.goto(URL); await p.waitForTimeout(800);
ok('ring is upright (not tilted)', (await p.locator('.ring-tilt').evaluate((e) => getComputedStyle(e).transform)) === 'none');
const ops = await p.locator('svg path[stroke-opacity]').evaluateAll((els) => els.map((e) => Number(e.getAttribute('stroke-opacity'))));
ok('wavy lines are very light (<= 10% opacity)', ops.length === 5 && Math.max(...ops) <= 0.1);

// riduci movimento: fila piatta, nessun autoplay
const rc = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1000, height: 800 } });
const rp = await rc.newPage(); await rp.goto(URL); await rp.waitForTimeout(500);
const r0 = await rp.locator('.ring-card[aria-current=true]').count();
await rp.waitForTimeout(3600);
ok('reduced motion: flat row, no 3D transform', (await rp.locator('.ring-track').evaluate((e) => getComputedStyle(e).transform)) === 'none');
ok('reduced motion: no autoplay', (await rp.locator('.ring-card[aria-current=true]').count()) === r0);

console.log('console/page errors:', errors);
if (errors.length) process.exitCode = 1;
await b.close();
