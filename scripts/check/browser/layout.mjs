import { join } from 'node:path';

const slug = (p) => (p === '/' ? 'root' : p.replace(/^\/|\/$/g, '').replaceAll('/', '_'));

// Every page at phone and desktop width: screenshot, nothing wider than the
// viewport, no request to another host before the visitor chooses anything.
export const layout = {
  name: 'layout, overflow and network',
  async run({ browser, base, pages, root }) {
    const problems = [];
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      page.on('request', (req) => {
        const host = new URL(req.url()).host;
        if (host !== new URL(base).host) problems.push(`${page.url()} requested ${req.url()}`);
      });
      for (const path of pages) {
        await page.goto(base + path, { waitUntil: 'networkidle' });
        const wide = await page.evaluate((w) =>
          [...document.querySelectorAll('body *')]
            .filter((el) => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== 'fixed')
            .slice(0, 3)
            .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`), width);
        if (wide.length) problems.push(`${path} at ${width}px: wider than viewport: ${wide.join(', ')}`);
        await page.evaluate(async () => {
          for (const img of document.images) { img.loading = 'eager'; img.decoding = 'sync'; }
          for (let y = 0; y < document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 40));
          }
          await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
          window.scrollTo(0, 0);
        });
        await page.screenshot({ path: join(root, 'test-results', 'screens', `${slug(path)}-${width}.png`), fullPage: true });
      }
      await context.close();
    }
    return problems;
  },
};

// Phone width: the menu is closed until the toggle opens it. The checkbox keeps
// working without JavaScript, so the menu is also reachable then.
export const mobileMenu = {
  name: 'mobile menu',
  async run({ browser, base }) {
    const problems = [];
    for (const [js, label] of [[true, 'JS'], [false, 'no-JS']]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: js });
      const page = await ctx.newPage();
      await page.goto(base + '/en/');
      const link = page.locator('.main-nav a[href="/en/contact/"]').first();
      if (await link.isVisible()) problems.push(`${label}: menu visible before opening`);
      await page.click('.nav-toggle-label');
      if (!(await link.isVisible())) problems.push(`${label}: menu did not open`);
      await ctx.close();
    }
    return problems;
  },
};
