// Writes dist/version.txt with the commit that was built, so a deploy can check that the live
// site really serves it. In GitHub Actions the commit is GITHUB_SHA, locally it is git HEAD.
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

let sha = process.env.GITHUB_SHA ?? '';
if (!sha) {
  try { sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { sha = 'unknown'; }
}
writeFileSync(new URL('../dist/version.txt', import.meta.url), sha + '\n');
console.log(`version.txt: ${sha.slice(0, 7)}`);
