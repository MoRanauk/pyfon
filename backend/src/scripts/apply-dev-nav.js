import fs from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.cwd(), '../apps/m3labs/src/Layout.jsx');
let s = fs.readFileSync(file, 'utf8');
if (s.includes('DevSide')) { console.log('Already done'); process.exit(0); }
const i1 = s.indexOf('const DEV_GROUPS');
const i2 = s.indexOf('export default function Layout');
const imp = "import { ls, photoKey } from './store.js';";
const mapRe = /\{nav\.map\([\s\S]*?\)\)\}/;
const swap = "  swap: '";
if (i1 < 0 || i2 < i1 || !s.includes(imp) || !mapRe.test(s) || !s.includes(swap)) { console.log('NOT FOUND'); process.exit(1); }
const comp = `const liveGroups = () => DEV_NAV.map((g) => ({ ...g, items: g.items.filter((i) => i[2]) })).filter((g) => g.items.length);
const inGroup = (g, p) => g.items.some(([to]) => (to === '/' ? p === '/' : p === to || p.startsWith(to + '/')));
function DevSide({ path }) {
  return liveGroups().map((g) => (
    <NavLink key={g.name} to={g.items[0][0]} end className={inGroup(g, path) ? 'active' : ''}><Icon n={g.icon} />{g.name}</NavLink>
  ));
}
function TopTabs({ path }) {
  const g = liveGroups().find((x) => inGroup(x, path));
  if (!g || g.items.length < 2) return null;
  return (
    <nav className="toptabs">
      <div className="tt-links">
        {g.items.map(([to, label]) => <NavLink key={to} to={to} end>{label}</NavLink>)}
      </div>
    </nav>
  );
}

`;
s = s.slice(0, i1) + comp + s.slice(i2);
s = s.replace(imp, imp + "\nimport { DEV_NAV } from './devNav.js';");
s = s.replace(mapRe, "{STAGE === 'dev' ? <DevSide path={loc.pathname} /> : nav.map(([to, icon, label, end]) => (\n          <NavLink key={to} to={to} end={Boolean(end)}><Icon n={icon} />{label}</NavLink>\n        ))}");
s = s.replace(swap, "  shield: '<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/>',\n  code: '<polyline points=\"16 18 22 12 16 6\"/><polyline points=\"8 6 2 12 8 18\"/>',\n  pulse: '<polyline points=\"22 12 18 12 15 21 9 3 6 12 2 12\"/>',\n" + swap);
fs.writeFileSync(file, s);
console.log('Patched');
