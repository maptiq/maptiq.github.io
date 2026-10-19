import { marked } from 'marked';
import { ui, defaultLocale, type Locale, type UiKey } from './ui';

export function getLocaleFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split('/');
  if (maybeLocale === 'en' || maybeLocale === 'hu' || maybeLocale === 'de') {
    return maybeLocale;
  }
  return defaultLocale;
}

// Static files under public/ live outside the locale tree.
const UNLOCALIZED_PREFIXES = ['/documents/', '/images/', '/assets/', '/favicon'];

// Pages are built as folders (/en/demo/index.html), so their URLs end in a
// slash. Without it the server answers with a 301 to the slashed URL.
function withSlash(href: string): string {
  const [, path, rest] = href.match(/^([^?#]*)(.*)$/)!;
  if (path.endsWith('/') || /\.[a-z0-9]+$/i.test(path)) return href;
  return `${path}/${rest}`;
}

// URL of a page from its path without the locale ("" for the homepage).
export function pageHref(locale: Locale, path: string): string {
  return withSlash(`/${locale}${path}`);
}

// Content stores site links without a locale ("/demo", "/#contact") so one
// English entry can serve every locale; this adds the current one.
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (UNLOCALIZED_PREFIXES.some((p) => href.startsWith(p))) return href;
  if (/^\/(en|hu|de)(\/|#|$)/.test(href)) return withSlash(href);
  return withSlash(`/${locale}${href}`);
}

export function localizeHtml(html: string, locale: Locale): string {
  return html.replace(/href="(\/[^"]*)"/g, (_, href) => `href="${localizeHref(href, locale)}"`);
}

// Body fields hold migrated HTML or Markdown; marked
// renders Markdown and passes HTML through untouched.
export function renderRich(body: string | undefined, locale: Locale): string {
  if (!body) return '';
  return localizeHtml(marked.parse(body, { async: false }), locale);
}

export function useTranslations(locale: Locale) {
  return function t(key: UiKey): string {
    return ui[locale][key] ?? ui[defaultLocale][key];
  };
}
