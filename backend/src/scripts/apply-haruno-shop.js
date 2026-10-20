import fs from 'fs';
import path from 'path';
const file = path.resolve(process.cwd(), '../apps/mco-brands/src/Layout.jsx');
let s = fs.readFileSync(file, 'utf8');
let bad = false;
function rep(a, b, marker) {
  if (s.includes(marker)) { console.log('Already done: ' + marker); return; }
  if (!s.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 60)); bad = true; return; }
  s = s.replace(a, () => b);
  console.log('Patched: ' + marker);
}
rep("import { Link, Outlet, useLocation } from 'react-router-dom';", "import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';\nimport { HelpButton } from '@pyfon/ui';\nimport { SHOP_TOURS, SHOP_TOPICS, SHOP_FAQ } from './helpTours.js';", 'SHOP_TOURS');
rep('const loc = useLocation();', 'const loc = useLocation();\n  const go = useNavigate();', 'const go = useNavigate()');
rep('<SiteFooter groups={footGroups} />', "<SiteFooter groups={footGroups} />\n      <HelpButton path={loc.pathname} topics={SHOP_TOPICS} faq={SHOP_FAQ} tours={SHOP_TOURS} go={go} lift={loc.pathname === '/' ? 130 : 0} />", '<HelpButton');
fs.writeFileSync(file, s);
process.exit(bad ? 1 : 0);
