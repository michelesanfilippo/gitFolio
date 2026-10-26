// Scarica font OFL/Apache da @fontsource (via jsDelivr) in public/fonts e genera il manifest.
// Uso: node scripts/fetch-fonts.mjs   (idempotente: salta i file già presenti)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname } from 'node:path';

const FONTS = {
  sans: [['inter', 'Inter'], ['source-sans-3', 'Source Sans 3'], ['open-sans', 'Open Sans'], ['lato', 'Lato'], ['roboto', 'Roboto'], ['noto-sans', 'Noto Sans'], ['work-sans', 'Work Sans'], ['nunito-sans', 'Nunito Sans'], ['raleway', 'Raleway'], ['montserrat', 'Montserrat'], ['poppins', 'Poppins']],
  serif: [['merriweather', 'Merriweather'], ['lora', 'Lora'], ['source-serif-4', 'Source Serif 4'], ['libre-baskerville', 'Libre Baskerville'], ['pt-serif', 'PT Serif'], ['noto-serif', 'Noto Serif'], ['crimson-pro', 'Crimson Pro'], ['spectral', 'Spectral']],
  modern: [['manrope', 'Manrope'], ['plus-jakarta-sans', 'Plus Jakarta Sans'], ['dm-sans', 'DM Sans'], ['space-grotesk', 'Space Grotesk'], ['outfit', 'Outfit'], ['sora', 'Sora'], ['figtree', 'Figtree'], ['urbanist', 'Urbanist']],
  classic: [['eb-garamond', 'EB Garamond'], ['cormorant-garamond', 'Cormorant Garamond'], ['libre-caslon-text', 'Libre Caslon Text'], ['cardo', 'Cardo'], ['crimson-text', 'Crimson Text']],
  tech: [['jetbrains-mono', 'JetBrains Mono'], ['ibm-plex-sans', 'IBM Plex Sans'], ['ibm-plex-mono', 'IBM Plex Mono'], ['fira-sans', 'Fira Sans'], ['fira-code', 'Fira Code'], ['space-mono', 'Space Mono'], ['roboto-mono', 'Roboto Mono']],
  elegant: [['playfair-display', 'Playfair Display'], ['dm-serif-display', 'DM Serif Display'], ['cinzel', 'Cinzel'], ['bodoni-moda', 'Bodoni Moda'], ['marcellus', 'Marcellus'], ['forum', 'Forum']],
};
const WEIGHTS = [300, 400, 500, 600, 700];
const CDN = 'https://cdn.jsdelivr.net/npm/@fontsource';
const exists = (p) => access(p).then(() => true, () => false);

async function get(url, dest) {
  if (await exists(dest)) return true;
  const r = await fetch(url);
  if (!r.ok) return false;
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await r.arrayBuffer()));
  return true;
}

const manifest = [];
for (const [category, list] of Object.entries(FONTS)) {
  for (const [slug, label] of list) {
    const files = [];
    const jobs = [];
    for (const style of ['normal', 'italic']) for (const weight of WEIGHTS) {
      const name = `${slug}-latin-${weight}-${style}.woff`;
      jobs.push(get(`${CDN}/${slug}@5/files/${name}`, `public/fonts/${slug}/${name}`).then((ok) => ok && files.push({ weight, style, file: name })));
    }
    await Promise.all(jobs);
    await get(`${CDN}/${slug}@5/LICENSE`, `public/fonts/${slug}/LICENSE.txt`);
    if (!files.some((f) => f.weight === 400 && f.style === 'normal')) { console.warn(`SKIP ${slug}: no 400 normal`); continue; }
    files.sort((a, b) => a.style.localeCompare(b.style) || a.weight - b.weight);
    manifest.push({ id: slug, label, category, files });
    console.log(`${slug}: ${files.length} files`);
  }
}
await writeFile('src/config/fonts-manifest.json', JSON.stringify(manifest, null, 1));
console.log(`manifest: ${manifest.length} families`);
