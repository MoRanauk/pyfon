import fs from 'fs';
import path from 'path';
function patch(file, pairs) {
  const p = path.resolve(process.cwd(), file);
  let s = fs.readFileSync(p, 'utf8');
  let bad = false;
  for (const [a, b, marker] of pairs) {
    const done = marker ? s.includes(marker) : (!s.includes(a) && s.includes(b));
    if (done) { console.log('Already done: ' + a.slice(0, 40)); continue; }
    if (!s.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 60)); bad = true; continue; }
    s = s.replace(a, () => b);
    console.log('Patched: ' + a.slice(0, 40));
  }
  fs.writeFileSync(p, s);
  return bad;
}
let bad = false;
bad = patch('../apps/m3labs/src/Layout.jsx', [
  ["{STAGE === 'dev' ? <TopTabs path={loc.pathname} /> : null}", '<TopTabs path={loc.pathname} />'],
  ["const inGroup = (g, p) => g.items.some(([to]) => (to === '/' ? p === '/' : p === to || p.startsWith(to + '/')));", "const inGroup = (g, p) => g.items.some(([to]) => (to === '/' ? p === '/' : p === to || p.startsWith(to + '/'))) || (g.name === 'Work' && (p.startsWith('/jobs/') || p.startsWith('/invoice/')));"],
  ["import { Footer } from '@pyfon/ui';", "import { Footer, HelpButton } from '@pyfon/ui';\nimport { HELP_TOPICS, HELP_FAQ } from './helpTopics.js';", 'HELP_TOPICS'],
  ['<Footer />', '<Footer /><HelpButton path={loc.pathname} topics={HELP_TOPICS} faq={HELP_FAQ} />', '<HelpButton path'],
]) || bad;
bad = patch('../apps/m3labs/src/partnerNav.js', [
  ["['/tools', 'Workspace tools', true], ['/help', 'Help', true],", "['/tools', 'Workspace tools', true],"],
]) || bad;
const idx = path.resolve(process.cwd(), '../packages/ui/src/index.jsx');
const t = fs.readFileSync(idx, 'utf8');
if (t.includes('HelpButton')) console.log('Already done: index export');
else { fs.writeFileSync(idx, t.replace(/\s*$/, '\n') + "export { default as HelpButton } from './HelpButton.jsx';\n"); console.log('Patched: index export'); }
process.exit(bad ? 1 : 0);
