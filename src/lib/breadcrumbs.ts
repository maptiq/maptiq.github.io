import { getEntry } from 'astro:content';
import type { Locale } from '../i18n/ui';
import { localizeHref, useTranslations } from '../i18n/utils';

export interface Crumb {
  label: string;
  href?: string;
}

// The trail follows the menu: a page listed under a menu item gets that item
// as its parent, so breadcrumbs and navigation never disagree.
export async function getBreadcrumbs(locale: Locale, path: string, title: string): Promise<Crumb[]> {
  if (!path) return [];
  const t = useTranslations(locale);
  const navigation = await getEntry('navigation', 'navigation');
  const label = (l: { en: string; hu?: string; de?: string }) => l[locale] || l.en;
  const home: Crumb = { label: t('nav.home'), href: `/${locale}/` };
  const segments = path.split('/').filter(Boolean);

  for (const item of navigation?.data.menu ?? []) {
    const child = item.children?.find((c) => c.link === path);
    if (child) {
      return [home, { label: label(item.label), href: localizeHref(item.link, locale) }, { label: label(child.label) }];
    }
  }

  // Nested routes such as /blog/<post> hang off their top-level menu item.
  if (segments.length > 1) {
    const parentPath = `/${segments[0]}`;
    const parent = navigation?.data.menu.find((item) => item.link === parentPath);
    if (parent) {
      return [home, { label: label(parent.label), href: localizeHref(parentPath, locale) }, { label: title }];
    }
  }

  const top = navigation?.data.menu.find((item) => item.link === path);
  return [home, { label: top ? label(top.label) : title }];
}
