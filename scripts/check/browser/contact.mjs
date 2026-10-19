// Contact form: mailto fallback without a key, Web3Forms success and failure paths
// (Web3Forms and hCaptcha are stubbed, nothing is sent).
import { readFileSync } from 'node:fs';

const yaml = readFileSync(new URL('../../../src/content/settings/contact.yaml', import.meta.url), 'utf8');
const hasKey = /^web3formsAccessKey:\s*'[^']+'/m.test(yaml);

async function fill(page) {
  await page.fill('input[name="name"]', 'Teszt Elek');
  await page.fill('input[name="email"]', 'teszt@example.com');
  await page.fill('textarea[name="message"]', 'Próba üzenet ékezetekkel: őű');
}

export const contactForm = {
  name: 'contact form paths',
  async run({ browser, base }) {
    const problems = [];
    for (const path of ['/en/contact/', '/hu/contact/', '/de/contact/']) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.route('https://js.hcaptcha.com/**', (route) => route.abort());
      await page.goto(base + path);
      if ((await page.getAttribute('textarea[name="message"]', 'maxlength')) !== '300') problems.push(`${path}: message is not capped at 300`);
      await page.fill('textarea[name="message"]', 'x'.repeat(10));
      if ((await page.textContent('[data-count]')) !== '10') problems.push(`${path}: counter not updated`);

      if (!hasKey) {
        // The fallback navigates to mailto:, which Chromium cannot open. Catch the attempt.
        let mailto = '';
        await page.route('mailto:**', (r) => r.abort());
        page.on('request', (r) => { if (r.url().startsWith('mailto:')) mailto = r.url(); });
        await fill(page);
        await page.click('.contact-form button[type="submit"]').catch(() => {});
        await page.waitForTimeout(300);
        if (mailto && !mailto.startsWith('mailto:info@maptiq.eu')) problems.push(`${path}: mailto goes to ${mailto}`);
        await ctx.close();
        continue;
      }

      await page.evaluate(() => {
        const box = document.querySelector('.h-captcha');
        const t = document.createElement('textarea');
        t.name = 'h-captcha-response'; t.value = 'token'; t.hidden = true;
        box?.append(t);
      });
      let sent = null;
      await page.route('https://api.web3forms.com/**', (route) => {
        sent = route.request().postData();
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });
      await fill(page);
      await Promise.all([page.waitForURL('**/thank-you/', { timeout: 5000 }).catch(() => problems.push(`${path}: no redirect to thank-you`)), page.click('.contact-form button[type="submit"]')]);
      if (!sent?.includes('Teszt Elek')) problems.push(`${path}: posted data misses the name`);

      await page.goto(base + path);
      await page.route('https://api.web3forms.com/**', (route) => route.abort());
      await page.evaluate(() => {
        const box = document.querySelector('.h-captcha');
        const t = document.createElement('textarea');
        t.name = 'h-captcha-response'; t.value = 'token'; t.hidden = true;
        box?.append(t);
      });
      await fill(page);
      await page.click('.contact-form button[type="submit"]');
      await page.waitForFunction(() => document.querySelector('.status')?.textContent?.trim().length > 0, null, { timeout: 5000 })
        .catch(() => problems.push(`${path}: no error shown when Web3Forms is unreachable`));
      if (await page.isDisabled('.contact-form button[type="submit"]')) problems.push(`${path}: button stays disabled after an error`);
      await ctx.close();
    }
    return problems;
  },
};
