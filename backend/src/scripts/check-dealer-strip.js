import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const CSS = `
/* featured dealers strip (7c29) */
.dealers{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:1000px;margin:20px auto 0;padding:0 16px}
.dealer{text-align:center;padding:16px;border:1px solid var(--pf-border,#ddd);border-radius:var(--pf-radius,8px);background:var(--pf-surface,#fff)}
.dealer img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--pf-radius,8px)}
.dealer h3{margin:10px 0 2px}
.dmark{display:inline-flex;width:56px;height:56px;border-radius:50%;align-items:center;justify-content:center;background:var(--pf-primary,#0b2a4a);color:#fff;font-size:24px}
`;
for (const app of ['mco-brands', 'prestige-m']) {
  const dir = path.join(root, 'apps', app, 'src');
  const css = path.join(dir, 'styles.css');
  if (!fs.existsSync(css)) { console.log(app + ': NOT FOUND styles.css'); continue; }
  if (/\.dealers\b/.test(fs.readFileSync(css, 'utf8'))) console.log(app + ': strip styles already exist');
  else { fs.appendFileSync(css, CSS); console.log(app + ': strip styles added'); }
  const users = fs.readdirSync(dir).filter((f) => /\.jsx$/.test(f) && f !== 'Dealers.jsx' && /from\s+'\.\/Dealers\.jsx'/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  console.log(app + ': strip is used by ' + (users.length ? users.join(', ') : 'NOTHING (paste me Home.jsx)'));
}
console.log('TriM: no strip by design');
