import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { parse } from 'yaml';
import config from '../astro.config.mjs';

const LOCALES = ['en', 'hu', 'de'];
const dir = (p: string) => new URL(`../src/content/${p}`, import.meta.url);
const files = (collection: string, loc: string) => readdirSync(dir(`${collection}/${loc}`)).filter((f) => f.endsWith('.mdx')).sort();
const front = (collection: string, loc: string, file: string) => {
  const text = readFileSync(new URL(file, dir(`${collection}/${loc}/`)), 'utf8');
  return parse(text.split('---')[1]);
};

for (const collection of ['pages', 'posts']) {
  test(`every ${collection} file exists in en, hu and de with the same slug`, () => {
    const en = files(collection, 'en');
    for (const loc of LOCALES) {
      assert.deepEqual(files(collection, loc), en, `${collection}/${loc} differs from en`);
      for (const f of en) assert.equal(front(collection, loc, f).slug, front(collection, 'en', f).slug, `${collection}/${loc}/${f}: slug differs`);
    }
  });
}

test('every page and post has a title, and structured pages a hero and sections', () => {
  for (const loc of LOCALES) for (const f of files('pages', loc)) {
    const fm = front('pages', loc, f);
    assert.ok(fm.title, `${loc}/${f}: no title`);
    if (fm.pageType === 'structured') assert.ok(fm.sections?.length, `${loc}/${f}: no sections`);
  }
});

const slugs = new Set(files('pages', 'en').map((f) => front('pages', 'en', f).slug as string));

// Internal links in navigation, footer and page sections point to pages that exist.
function links(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => links(n, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === 'link' && typeof v === 'string') out.push(v);
      else if (k === 'buttons' || typeof v === 'object') links(v, out);
    }
  }
  return out;
}
test('internal links in content resolve to existing pages and anchors', () => {
  const all: string[] = [];
  for (const f of ['navigation.yaml', 'footer.yaml']) all.push(...links(parse(readFileSync(dir(`settings/${f}`), 'utf8'))));
  for (const f of files('pages', 'en')) all.push(...links(front('pages', 'en', f)));
  for (const l of all) {
    if (/^(https?:|mailto:|tel:|#)/.test(l)) continue;
    const [path, hash] = l.split('#');
    const slug = path.replace(/^\//, '').replace(/\/$/, '');
    if (slug === '' || slug === 'blog') continue;
    assert.ok(slugs.has(slug), `link ${l} points to no page`);
    if (hash) {
      const fm = front('pages', 'en', files('pages', 'en').find((f) => front('pages', 'en', f).slug === slug)!);
      const anchors = (fm.sections ?? []).map((s: { anchorId?: string }) => s.anchorId);
      assert.ok(anchors.includes(hash), `link ${l}: no section with anchorId ${hash}`);
    }
  }
});

test('analytics ID, when set, is a valid GA4 measurement ID', () => {
  const id = parse(readFileSync(dir('settings/contact.yaml'), 'utf8')).gaMeasurementId ?? '';
  assert.ok(id === '' || /^G-[A-Z0-9]{4,}$/.test(id), `bad gaMeasurementId ${id}`);
});

test('old Jekyll URLs redirect to pages that exist', () => {
  const redirects = (config as { redirects: Record<string, string> }).redirects;
  for (const [from, to] of Object.entries(redirects)) {
    assert.match(from, /\/$/, `${from}: no trailing slash`);
    const [, loc, slug] = to.match(/^\/(en|hu|de)\/([^/]+)\/$/) ?? [];
    assert.ok(loc && slugs.has(slug), `${from} -> ${to}: target is no page`);
    assert.ok(existsSync(dir(`pages/${loc}/${slug}.mdx`)), `${to}: missing file`);
  }
});

test('the build keeps route conflicts as errors and trailing slashes on', () => {
  assert.equal((config as { trailingSlash: string }).trailingSlash, 'always');
  assert.equal((config as { prerenderConflictBehavior: string }).prerenderConflictBehavior, 'error');
});

// Three places describe the old-URL redirects: scripts/old_urls.txt (the live check),
// astro.config.mjs (GitHub Pages) and public/.htaccess (Apache). They must agree.
test('old_urls.txt, astro redirects and .htaccess describe the same redirects', () => {
  const list = readFileSync(new URL('../scripts/old_urls.txt', import.meta.url), 'utf8')
    .split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(' '));
  const redirects = (config as { redirects: Record<string, string> }).redirects;
  const htaccess = readFileSync(new URL('../public/.htaccess', import.meta.url), 'utf8');
  assert.deepEqual(Object.fromEntries(list), redirects);
  for (const [from, to] of list) {
    const pattern = from.replace(/^\/|\/$/g, '');
    const rule = new RegExp(`RewriteRule \\^${pattern}/\\?\\$ ${to} \\[R=301,L\\]`);
    assert.match(htaccess, rule, `.htaccess has no 301 for ${from} -> ${to}`);
  }
});
