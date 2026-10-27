import { chromium } from 'playwright';
const port = process.argv[2] ?? '4174';
const b = await chromium.launch();
const sizes = [[1920, 969], [1536, 730], [1440, 790], [1366, 625], [1280, 600], [1024, 650], [1920, 1080]];
for (const [w, h] of sizes) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`http://localhost:${port}/gitFolio/en/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const d = document.documentElement;
    const cw = d.clientWidth, ch = d.clientHeight;
    const over = [...document.querySelectorAll('body *')].filter((e) => !e.closest('svg') && !e.closest('.ring-stage') && !e.closest('.phone-scene'))
      .filter((e) => { const b = e.getBoundingClientRect(); return b.right > cw + 0.5 || b.bottom > ch + 0.5 || b.left < -0.5; })
      .slice(0, 8).map((e) => { const b = e.getBoundingClientRect(); return `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 4).join('.')} l=${Math.round(b.left)} r=${Math.round(b.right)} b=${Math.round(b.bottom)}`; });
    const cs = (el) => { const s = getComputedStyle(el); return `${s.overflowX}/${s.overflowY} gutter=${s.scrollbarGutter}`; };
    const main = document.querySelector('main');
    return { cw, ch, sw: d.scrollWidth, sh: d.scrollHeight, bsw: document.body.scrollWidth, msw: main.scrollWidth, mw: main.getBoundingClientRect().width, html: cs(d), body: cs(document.body), header: document.querySelector('header').getBoundingClientRect().height, mainH: main.getBoundingClientRect().height, over };
  });
  const flag = (r.sw > r.cw ? ' H-SCROLL' : '') + (r.sh > r.ch ? ' V-SCROLL' : '');
  console.log(`${w}x${h}: W ${r.sw}/${r.cw} (body ${r.bsw}, main ${r.msw}/${Math.round(r.mw)}) H ${r.sh}/${r.ch} header ${r.header} main ${Math.round(r.mainH)} html ${r.html} body ${r.body}${flag}`);
  if (r.over.length) console.log('   ', r.over.join(' | '));
  await p.close();
}
await b.close();
