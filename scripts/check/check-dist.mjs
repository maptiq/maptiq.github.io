// Checks every HTML file in dist/: one h1, canonical, hreflang, links, anchors, alt
// attributes, no external resources, the same menu on every page of a language.
// Usage: node scripts/check/check-dist.mjs   (exits 1 on any problem)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'node-html-parser';
import { checkPage, navSignature, isSpecial, localeOf } from './lib.mjs';

const DIST = new URL('../../dist/', import.meta.url).pathname;
const SITE = 'https://maptiq.eu';

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
});

const fileFor = (urlPath) => {
  const rel = urlPath.replace(/^\//, '');
  if (rel === '' || rel.endsWith('/')) return join(DIST, rel, 'index.html');
  return join(DIST, rel);
};
const idCache = new Map();
const ctx = {
  site: SITE,
  // Old Jekyll URLs may be linked: they resolve through meta-refresh stubs.
  exempt: new Set(['/services/', '/team/', '/about/', '/contact/']),
  exists: (urlPath) => existsSync(fileFor(urlPath)),
  idsOf: (urlPath) => {
    if (!idCache.has(urlPath)) {
      const html = readFileSync(fileFor(urlPath), 'utf8');
      idCache.set(urlPath, new Set(parse(html).querySelectorAll('[id]').map((e) => e.id)));
    }
    return idCache.get(urlPath);
  },
};

let failures = 0;
let checked = 0;
const navs = {};
for (const file of walk(DIST)) {
  const rel = relative(DIST, file);
  const html = readFileSync(file, 'utf8');
  if (isSpecial(rel, html)) continue;
  checked++;
  for (const p of checkPage(rel, html, ctx)) {
    failures++;
    console.log(`FAIL ${rel}: ${p}`);
  }
  const loc = localeOf(rel);
  const sig = navSignature(html);
  ((navs[loc] ??= new Map()).get(sig) ?? (navs[loc].set(sig, []), navs[loc].get(sig))).push(rel);
}
for (const [loc, sigs] of Object.entries(navs)) {
  if (sigs.size > 1) {
    failures++;
    console.log(`FAIL menu differs between ${loc} pages: ${[...sigs.values()].map((v) => v[0]).join(', ')}`);
  }
}

// Files the host needs.
for (const f of ['404.html', 'robots.txt', 'sitemap-index.xml', 'CNAME', 'favicon.ico']) {
  if (!existsSync(join(DIST, f))) { failures++; console.log(`FAIL dist/${f} is missing`); }
}
console.log(`${checked} pages checked, ${failures} problem(s)`);
process.exit(failures ? 1 : 0);
