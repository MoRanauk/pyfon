import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const src = path.join(root, 'apps', 'm3labs');
const dst = path.join(root, 'apps', 'dealer');
if (fs.existsSync(path.join(dst, 'package.json'))) { console.log('Already done: apps/dealer exists'); process.exit(0); }
fs.mkdirSync(path.join(dst, 'src'), { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
pkg.name = '@pyfon/dealer';
pkg.scripts = { dev: 'vite --port 5178 --strictPort', build: 'vite build', preview: 'vite preview --port 5178' };
fs.writeFileSync(path.join(dst, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

let cfg = null;
for (const n of ['vite.config.js', 'vite.config.mjs', 'vite.config.ts']) {
  const f = path.join(src, n);
  if (fs.existsSync(f)) { cfg = n; fs.writeFileSync(path.join(dst, n), fs.readFileSync(f, 'utf8').replace(/5174/g, '5178')); break; }
}
if (!cfg) console.log('NOTE: no vite config found in m3labs');
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8').replace(/<title>[^<]*<\/title>/, '<title>Pyfon Dealer Portal</title>');
fs.writeFileSync(path.join(dst, 'index.html'), html);

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
console.log('Workspaces: ' + JSON.stringify(rootPkg.workspaces));
console.log('PASS: apps/dealer created');
