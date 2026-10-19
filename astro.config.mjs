// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { isNoindexUrl } from './src/lib/seo.ts';

// https://astro.build/config
// Hosted on GitHub Pages: there is no .htaccess, so the old Jekyll URLs are
// redirected by Astro itself (static meta-refresh pages with a canonical link).
export default defineConfig({
  site: 'https://maptiq.eu',
  trailingSlash: 'always',
  // A duplicate slug or a route collision must stop the build, not silently let one file win.
  prerenderConflictBehavior: 'error',
  integrations: [
    mdx(),
    // "/" is a language picker page, so it stays out of the sitemap.
    sitemap({ filter: (page) => new URL(page).pathname !== '/' && !isNoindexUrl(page) }),
  ],
  i18n: {
    locales: ['en', 'hu', 'de'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: true },
  },
  redirects: {
    '/services/': '/hu/services/',
    '/services/konzultacio/': '/hu/services/',
    '/team/': '/hu/about/',
    '/about/': '/hu/about/',
    '/contact/': '/hu/contact/',
    '/team/barancsuk-adam/': '/hu/about/',
    '/team/berenyi-attila/': '/hu/about/',
    '/team/sandor-csaba/': '/hu/about/',
  },
});
