// Renderizza video/launch.html in un MP4 a 60 fps: ogni fotogramma è disegnato da window.seek(secondi) e fotografato da Chromium,
// poi i PNG vengono passati a ffmpeg (H.264, yuv420p). Serve un ffmpeg: in PATH oppure in FFMPEG_PATH.
// Uso: node scripts/render-video.mjs [--fps 60] [--out video/out/gitfolio-launch.mp4] [--from 0] [--to <secondi>] [--still 12.5]
//   --still N  salva solo il fotogramma al secondo N come PNG (controllo rapido), senza ffmpeg.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? def : process.argv[i + 1]; };
const fps = Number(arg('fps', 60));
const out = resolve(arg('out', 'video/out/gitfolio-launch.mp4'));
const still = arg('still');
const html = pathToFileURL(resolve('video/launch.html')).href + '?render';
const WORKERS = 4; // pagine in parallelo: ogni fotogramma è una funzione del tempo, quindi l'ordine è garantito dallo script

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const pages = await Promise.all(Array.from({ length: still ? 1 : WORKERS }, async () => {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await p.goto(html, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  return p;
}));
const duration = await pages[0].evaluate(() => window.__duration);
const shot = async (p, t) => { await p.evaluate((s) => window.seek(s), t); return p.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' }); };

if (still !== undefined) {
  const file = resolve(`video/out/still-${String(still).replace('.', '_')}.png`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, await shot(pages[0], Number(still)));
  console.log(file);
  await browser.close();
  process.exit(0);
}

const from = Number(arg('from', 0)), to = Number(arg('to', duration));
const first = Math.round(from * fps), last = Math.round(to * fps);
mkdirSync(dirname(out), { recursive: true });
const ffmpegBin = process.env.FFMPEG_PATH || 'ffmpeg';
const ff = spawn(ffmpegBin, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));

const t0 = Date.now();
for (let i = first; i < last; i += WORKERS) {
  const batch = await Promise.all(pages.map((p, k) => (i + k < last ? shot(p, (i + k) / fps) : null)));
  for (const b of batch) if (b) await write(b);
  if ((i - first) % (fps * 2) < WORKERS) process.stdout.write(`\r${((i - first) / (last - first) * 100).toFixed(0).padStart(3)}%  ${((i + WORKERS) / fps).toFixed(1)}s / ${to.toFixed(1)}s`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exit ${code}`)))));
await browser.close();
console.log(`\n${out}  (${last - first} frames @ ${fps} fps, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
