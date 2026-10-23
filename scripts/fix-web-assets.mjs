// Vercel leaves every `node_modules` folder out of a deployment, and the web export keeps
// fonts and icons under web/assets/node_modules. Move them to web/assets/vendor and point
// the bundles at the new path, or the site loads without its fonts and icons.
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const web = process.argv[2] ?? 'web';
const from = join(web, 'assets', 'node_modules');
if (existsSync(from)) renameSync(from, join(web, 'assets', 'vendor'));

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
for (const f of files(web).filter((f) => /\.(js|html|json)$/.test(f))) {
  const s = readFileSync(f, 'utf8');
  if (s.includes('assets/node_modules/')) writeFileSync(f, s.replaceAll('assets/node_modules/', 'assets/vendor/'));
}
