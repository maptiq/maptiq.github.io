// Scans the site copy for placeholder text and house-rule violations, and for
// untranslated gaps. Rows marked "(check)" are listed as open items, not failures.
// Usage: node scripts/check/check-text.mjs   (exits 1 on any hit)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const DIRS = ['src/content', 'src/i18n'];
const PATTERNS = [
  [/lorem ipsum|\bTODO\b|\bFIXME\b|xxx/i, 'placeholder text'],
  [/[—–]/, 'dash character (use a comma, colon or full stop)'],
  [/\bMaptiq\b|\bMAPTIQ\b(?!<)|\bMaptIq\b/, 'brand spelled wrong, use MaptIQ'],
  [/surviot\.com\/(?!"|\))/, 'link into surviot.com subpages'],
  [/\bhttps?:\/\/(www\.)?maptiq\.eu\/[^\s")]*[^/\s")]\s/, 'internal absolute link without trailing slash'],
  [/Free Jekyll theme|zerostatic/i, 'leftover from the old Jekyll site'],
];
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(mdx|md|ya?ml|ts)$/.test(p) ? [p] : [];
});
let hits = 0;
let open = 0;
for (const file of DIRS.flatMap((d) => walk(join(ROOT, d)))) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const [re, what] of PATTERNS) {
      if (re.test(line)) {
        hits++;
        console.log(`${relative(ROOT, file)}:${i + 1}: ${what}: ${line.trim().slice(0, 100)}`);
      }
    }
    if (/\(check\)|\(ellenőrizendő\)|\(zu prüfen\)/.test(line)) {
      open++;
      console.log(`open  ${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 90)}`);
    }
  });
}
console.log(`${hits} problem(s), ${open} open item(s) for the owner`);
process.exit(hits ? 1 : 0);
