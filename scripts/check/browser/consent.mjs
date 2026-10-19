// Cookie banner and Google Analytics. Runs against the ID in contact.yaml. Google is
// stubbed, nothing is sent. Without an ID the banner and the footer link must be absent.
import { readFileSync } from 'node:fs';

const yaml = readFileSync(new URL('../../../src/content/settings/contact.yaml', import.meta.url), 'utf8');
const id = yaml.match(/^gaMeasurementId:\s*'?(G-[A-Z0-9]+)'?/m)?.[1] ?? '';
const GA = 'https://www.googletagmanager.com/';

export const consent = {
  name: 'cookie consent and analytics',
  async run({ browser, base }) {
    const problems = [];
    const open = async (locale = 'en-GB') => {
      const context = await browser.newContext({ viewport: { width: 390, height: 800 }, locale });
      const page = await context.newPage();
      const ga = [];
      await page.route(GA + '**', (route) => { ga.push(route.request().url()); route.fulfill({ contentType: 'text/javascript', body: '' }); });
      await page.route('https://*.google-analytics.com/**', (route) => { ga.push(route.request().url()); route.fulfill({ status: 204, body: '' }); });
      return { context, page, ga };
    };

    if (!id) {
      const { context, page } = await open();
      await page.goto(base + '/en/');
      if (await page.locator('.cookie-consent, [data-cookie-settings]').count()) problems.push('banner or settings link present without a measurement ID');
      await context.close();
      return problems;
    }

    // First visit: banner shown, nothing requested, Decline keeps it that way.
    let { context, page, ga } = await open();
    await page.goto(base + '/en/', { waitUntil: 'networkidle' });
    if (!(await page.locator('.cookie-consent').isVisible())) problems.push('banner not visible on first visit');
    if (ga.length) problems.push('Google requested before consent');
    await page.click('[data-consent="denied"]');
    if (await page.locator('.cookie-consent').isVisible()) problems.push('banner still visible after Decline');
    await page.goto(base + '/en/contact/', { waitUntil: 'networkidle' });
    if (await page.locator('.cookie-consent').isVisible()) problems.push('banner came back after Decline');
    if (ga.length) problems.push('Google requested after Decline');

    // The footer link reopens the banner, accepting loads Google with the ID.
    await page.click('[data-cookie-settings]');
    if (!(await page.locator('.cookie-consent').isVisible())) problems.push('footer link did not reopen the banner');
    await page.click('[data-consent="granted"]');
    await page.waitForTimeout(300);
    if (!ga.some((u) => u.includes(`gtag/js?id=${id}`))) problems.push('Google not loaded after Decline then Accept');

    // A later visit with the choice stored loads Google without asking.
    ga.length = 0;
    await page.goto(base + '/de/', { waitUntil: 'networkidle' });
    if (await page.locator('.cookie-consent').isVisible()) problems.push('banner shown again after a stored choice');
    if (!ga.some((u) => u.includes(`gtag/js?id=${id}`))) problems.push('stored consent did not load Google');
    await context.close();

    // Phone width, in the longest language: the banner must fit.
    for (const path of ['/en/', '/hu/', '/de/']) {
      ({ context, page } = await open());
      await page.goto(base + path);
      const box = await page.locator('.cookie-consent').boundingBox();
      if (!box || box.x < 0 || box.x + box.width > 390) problems.push(`banner wider than the phone screen on ${path}`);
      await context.close();
    }
    return problems;
  },
};
