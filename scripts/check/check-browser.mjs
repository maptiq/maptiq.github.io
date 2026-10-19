// Browser checks with Playwright against `astro preview`. Screenshots go to
// test-results/screens/. Usage: npm run build && node scripts/check/check-browser.mjs
// CHECKS=consent runs only the checks whose name contains that text.
import { spawn } from 'node:child_process';
import { readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';
import { checks } from './browser/index.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const PORT = 4329;
const base = `http://localhost:${PORT}`;

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('index.html') ? [p] : [];
});
// Real pages only: the old-URL stubs just redirect, "/" is covered by its own check.
const pages = walk(DIST).map((f) => '/' + relative(DIST, f).replace(/index\.html$/, '')).filter((p) => /^\/(en|hu|de)\//.test(p));

const server = spawn(process.execPath, [join(ROOT, 'node_modules/astro/bin/astro.mjs'), 'preview', '--port', String(PORT), '--ignore-lock'], { cwd: ROOT, stdio: 'ignore' });
const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + '/en/')).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('astro preview did not start');
};

let failures = 0;
const browser = await chromium.launch();
try {
  await waitForServer();
  mkdirSync(join(ROOT, 'test-results', 'screens'), { recursive: true });
  const only = process.env.CHECKS;
  for (const check of checks.filter((c) => !only || c.name.includes(only))) {
    const problems = await check.run({ browser, base, pages, root: ROOT });
    for (const p of problems) console.log(`FAIL [${check.name}] ${p}`);
    failures += problems.length;
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${check.name}`);
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(failures ? 1 : 0);
