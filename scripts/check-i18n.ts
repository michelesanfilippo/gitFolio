import { readFileSync } from 'node:fs';

const locales = ['en', 'it', 'fr', 'de', 'es'];
const flat = (o: unknown, p = ''): string[] =>
  typeof o === 'object' && o !== null
    ? Object.entries(o).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k))
    : [p];

const load = (l: string) => new Set(flat(JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'))));
const ref = load('en');
let bad = 0;
for (const l of locales.filter((x) => x !== 'en')) {
  const keys = load(l);
  for (const k of ref) if (!keys.has(k)) { console.error(`[${l}] missing: ${k}`); bad++; }
  for (const k of keys) if (!ref.has(k)) { console.error(`[${l}] orphan: ${k}`); bad++; }
}
if (bad) process.exit(1);
console.log(`i18n ok: ${ref.size} keys x ${locales.length} locales`);
