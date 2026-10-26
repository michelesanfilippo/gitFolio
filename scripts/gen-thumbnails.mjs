// Genera public/templates/<preset>.webp (anteprime per il carosello della home) dal vero motore PDF.
// Uso: pnpm build && node scripts/serve-out.mjs & node scripts/gen-thumbnails.mjs
// Richiede Python + Pillow per la conversione in WebP. Foto: scripts/assets/avatar-N.jpg (illustrazioni fittizie, nessuna persona reale).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// Stesso ordine di src/config/presets.ts: l'avatar i-esimo (scripts/assets/avatar-N.jpg, generati da gen-avatars.py) va al preset i-esimo.
const ids = ['lime-classic', 'midnight', 'editorial', 'corporate', 'minimal', 'creative', 'sage-studio', 'executive', 'tech', 'rose', 'bold', 'contrast'];
const base = process.argv[2] ?? 'http://localhost:4173/gitFolio/en/editor/';
mkdirSync('public/templates', { recursive: true });
mkdirSync('.tmp-thumbs', { recursive: true });

const b = await chromium.launch();
for (const [i, id] of ids.entries()) {
  const p = await b.newPage({ viewport: { width: 1400, height: 1500 }, deviceScaleFactor: 1 });
  await p.goto(`${base}?preset=${id}`);
  const count = () => p.locator('section[data-render-count]').getAttribute('data-render-count').then(Number);
  const settle = async (prev) => { await p.waitForFunction((n) => Number(document.querySelector('section[data-render-count]')?.dataset.renderCount) > n, prev, { timeout: 30000 }); await p.waitForTimeout(900); return count(); };
  let n = await settle(-1);
  await p.setInputFiles('[data-testid=photo-input]', `scripts/assets/avatar-${i + 1}.jpg`);
  n = await settle(n);
  await p.locator('canvas').first().screenshot({ path: `.tmp-thumbs/${id}.png` });
  await p.close();
  console.log('shot', id);
}
await b.close();
execFileSync('python', ['-c', `
from PIL import Image
import sys
for i in ${JSON.stringify(ids)}:
    im = Image.open(f'.tmp-thumbs/{i}.png').convert('RGB')
    h = round(im.height * 640 / im.width)
    im.resize((640, h), Image.LANCZOS).save(f'public/templates/{i}.webp', quality=84, method=6)
    # carosello 3D: le card sono texture GPU ridotte senza mipmap, da 640 px sembrano puntinate (aliasing);
    # versioni già alla misura mostrata (1x / 2x, scelte con image-set) restano nitide
    for tag, w in (('c1', 132), ('c2', 264)):
        im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(f'public/templates/{i}-{tag}.webp', quality=90, method=6)
    print('webp', i, 640, h)
`], { stdio: 'inherit' });
