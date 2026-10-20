import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
let bad = false;

function patch(file, oldStr, newStr) {
  const p = path.resolve(cwd, file);
  const t = fs.readFileSync(p, 'utf8');
  const name = path.basename(file);
  if (t.includes(newStr)) { console.log(name + ': Already done'); return; }
  if (!t.includes(oldStr)) { console.log(name + ': NOT FOUND ' + oldStr); bad = true; return; }
  fs.writeFileSync(p, t.replace(oldStr, () => newStr));
  console.log(name + ': Patched');
}

const L = '../apps/m3labs/src/Layout.jsx';
patch(L, "import { NavLink, useLocation } from 'react-router-dom';",
  "import { NavLink, useLocation, useNavigate } from 'react-router-dom';");
patch(L, "import { DEV_NAV as DEV_MENU } from './devNav.js';",
  "import { DEV_NAV as DEV_MENU } from './devNav.js';\nimport { PARTNER_MENU } from './partnerNav.js';");
patch(L, "const liveGroups = () => DEV_MENU.map(",
  "const MENU = STAGE === 'dev' ? DEV_MENU : PARTNER_MENU;\nconst liveGroups = () => MENU.map(");
patch(L, "const loc = useLocation();",
  "const loc = useLocation();\n  const go = useNavigate();");
patch(L, "{STAGE === 'dev' ? <DevSide path={loc.pathname} /> : nav.map(",
  "{MENU ? <DevSide path={loc.pathname} /> : nav.map(");
patch(L, "{STAGE === 'dev' ? <TopTabs path={loc.pathname} /> : null}",
  "<TopTabs path={loc.pathname} />");
patch(L, '<div className="me">',
  '<div className="me" role="link" tabIndex={0} title="Your settings" style={{ cursor: \'pointer\' }} onClick={() => go(\'/settings\')} onKeyDown={(e) => { if (e.key === \'Enter\') go(\'/settings\'); }}>');

const D = '../apps/m3labs/src/DevReports.jsx';
patch(D, "import { get } from './http.js';",
  "import { get } from './http.js';\nimport { STAGE } from './api.js';");
patch(D, "const R = '/v1/dev/reports';",
  "const R = (STAGE === 'dev' ? '/v1/dev' : '/v1/partner') + '/reports';");

patch('src/routes/groups.js', "partnerRoutes.use(partnerCsvRoutes);",
  "partnerRoutes.use(partnerCsvRoutes);\npartnerRoutes.use(reportRoutes);");

if (bad) { console.log('FAIL'); process.exit(1); }
console.log('PASS');
