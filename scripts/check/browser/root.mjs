// "/" picks the visitor's language from the browser, English when unknown.
export const rootPicker = {
  name: 'language picker at /',
  async run({ browser, base }) {
    const problems = [];
    for (const [locale, want] of [['hu-HU', '/hu/'], ['de-AT', '/de/'], ['fr-FR', '/en/'], ['en-GB', '/en/']]) {
      const ctx = await browser.newContext({ locale });
      const page = await ctx.newPage();
      await page.goto(base + '/');
      await page.waitForURL(`**${want}`, { timeout: 5000 }).catch(() => {});
      if (new URL(page.url()).pathname !== want) problems.push(`${locale} ended on ${new URL(page.url()).pathname}, expected ${want}`);
      await ctx.close();
    }
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base + '/');
    for (const l of ['/en/', '/hu/', '/de/']) if (!(await page.locator(`a[href="${l}"]`).count())) problems.push(`no-JS: link ${l} missing`);
    await ctx.close();
    return problems;
  },
};
