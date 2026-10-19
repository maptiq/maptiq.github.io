// Astro copies the source image of every content-collection entry into
// dist/_astro/, even though the pages only use the resized WebP versions.
// This removes images in _astro/ that no HTML, CSS or JS file mentions.
// Runs after `astro build`, before the zip (see package.json).
import { readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, relative } from 'node:path';

const IMAGE = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

export function unreferencedImages(files, texts) {
  const all = texts.join('\n');
  return files.filter((f) => f.startsWith('_astro/') && IMAGE.test(f) && !all.includes('/' + f));
}

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = new URL('../dist/', import.meta.url).pathname;
  const files = walk(dist).map((p) => relative(dist, p));
  const texts = files.filter((f) => /\.(html|css|js|xml)$/.test(f)).map((f) => readFileSync(join(dist, f), 'utf8'));
  const unused = unreferencedImages(files, texts);
  let bytes = 0;
  for (const f of unused) {
    bytes += statSync(join(dist, f)).size;
    unlinkSync(join(dist, f));
  }
  console.log(`pruned ${unused.length} unused images, ${(bytes / 1e6).toFixed(1)} MB`);
}
