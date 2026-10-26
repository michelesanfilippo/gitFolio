// Serve ./out sotto /gitFolio come farebbe GitHub Pages (project page). Uso: node scripts/serve-out.mjs [porta]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const BASE = '/gitFolio';
const PORT = Number(process.argv[2] ?? 4173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith(BASE)) { res.writeHead(404).end('not under basePath'); return; }
  let file = join('out', normalize(decodeURIComponent(url.pathname.slice(BASE.length))));
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch {}
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/html' }).end(await readFile('out/404.html').catch(() => '404'));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/`));
