import { parse } from 'node-html-parser';

const LOCALES = ['en', 'hu', 'de'];
const NOINDEX = ['404-something-went-wrong', 'thank-you'];

// Pages that are not part of the language tree: the "/" picker, the 404 page and
// the meta-refresh stubs Astro writes for the old Jekyll URLs.
export function isSpecial(relPath, html) {
  return relPath === 'index.html' || relPath === '404.html' || html.includes('Redirecting to:');
}

export const localeOf = (relPath) => relPath.split('/')[0];

// Checks one built HTML page. Returns a list of problems, empty when clean.
export function checkPage(relPath, html, ctx) {
  const problems = [];
  const root = parse(html);
  const urlPath = '/' + relPath.replace(/index\.html$/, '').replace(/\.html$/, '/');
  const locale = localeOf(relPath);

  if (/&lt;\/?(a|p|ul|li|strong|br)\b/.test(html)) problems.push('escaped HTML shown as text (&lt;a ...)');

  const h1s = root.querySelectorAll('h1').length;
  if (h1s !== 1) problems.push(`${h1s} h1 elements`);

  if (root.querySelector('html')?.getAttribute('lang') !== locale) problems.push(`html lang is not ${locale}`);

  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (canonical !== ctx.site + urlPath) problems.push(`canonical is ${canonical}, expected ${ctx.site + urlPath}`);

  const rest = urlPath.replace(/^\/(en|hu|de)/, '');
  for (const loc of LOCALES) {
    const alt = root.querySelector(`link[rel="alternate"][hreflang="${loc}"]`)?.getAttribute('href');
    if (alt !== `${ctx.site}/${loc}${rest}`) problems.push(`hreflang ${loc} is ${alt}`);
  }
  if (!root.querySelector('link[rel="alternate"][hreflang="x-default"]')) problems.push('no hreflang x-default');

  const slug = rest.replace(/\//g, '');
  if (NOINDEX.includes(slug) && !root.querySelector('meta[name="robots"][content*="noindex"]')) problems.push('utility page is not noindex');
  if (!NOINDEX.includes(slug) && !root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()) problems.push('no meta description');

  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    const local = href.startsWith(ctx.site) ? href.slice(ctx.site.length) : href;
    if (!local.startsWith('/') || local.startsWith('//')) continue;
    const [pathPart, hash] = local.split('#');
    const target = pathPart.split('?')[0] || urlPath;
    if (!ctx.exists(target)) problems.push(`broken link ${href}`);
    else if (hash && !ctx.idsOf(target).has(hash)) problems.push(`missing anchor ${href}`);
    if (/^\/(?!en\/|hu\/|de\/)[a-z0-9-]+\/?$/.test(target) && !ctx.exempt.has(target)) problems.push(`link without language prefix ${href}`);
  }

  for (const img of root.querySelectorAll('img')) {
    if (img.getAttribute('alt') === null) problems.push(`img without alt attribute: ${img.getAttribute('src')}`);
  }

  // The site loads nothing from other hosts. Analytics and hCaptcha are added by scripts on demand.
  const resources = [
    ...root.querySelectorAll('script[src]').map((e) => e.getAttribute('src')),
    ...root.querySelectorAll('img[src], iframe[src], source[src]').map((e) => e.getAttribute('src')),
    ...root.querySelectorAll('link[href]').filter((e) => !['canonical', 'alternate'].includes(e.getAttribute('rel'))).map((e) => e.getAttribute('href')),
  ];
  for (const src of resources) {
    if (/^(https?:)?\/\//.test(src) && !src.startsWith(ctx.site)) problems.push(`external resource ${src}`);
  }
  return problems;
}

// The main menu without active/current markers, so it can be compared between pages.
export function navSignature(html) {
  const nav = parse(html).querySelector('.main-nav > ul');
  return (nav?.outerHTML ?? '').replace(/\s*aria-current="[^"]*"/g, '');
}
