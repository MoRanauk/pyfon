import fs from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.cwd(), '../apps/m3labs/src/Layout.jsx');
let s = fs.readFileSync(file, 'utf8');
if (s.includes('TopTabs')) { console.log('Already done'); process.exit(0); }
const a = 'export default function Layout({ children }) {';
const b = '{covering ? <div className="cover">';
if (!s.includes(a) || !s.includes(b)) { console.log('NOT FOUND'); process.exit(1); }
const comp = `const DEV_GROUPS = [
  ['Monitor', [['/health', 'System health'], ['/logs', 'Logs and traces'], ['/activity', 'Activity log']]],
  ['People', [['/users', 'Users'], ['/tickets', 'Tickets']]],
  ['Work', [['/videos', 'Videos'], ['/tools', 'Workspace tools']]],
  ['Help', [['/settings', 'Settings'], ['/help', 'Help']]],
];
function TopTabs({ path }) {
  const here = DEV_GROUPS.find(([, links]) => links.some(([to]) => path === to || path.startsWith(to + '/')));
  const shown = here || DEV_GROUPS[0];
  return (
    <nav className="toptabs">
      <div className="tt-groups">
        <NavLink to="/" end>Home</NavLink>
        {DEV_GROUPS.map(([name, links]) => <NavLink key={name} to={links[0][0]} className={here && here[0] === name ? 'active' : ''}>{name}</NavLink>)}
      </div>
      <div className="tt-links">
        {shown[1].map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
      </div>
    </nav>
  );
}

`;
s = s.replace(a, comp + a);
s = s.replace(b, "{STAGE === 'dev' ? <TopTabs path={loc.pathname} /> : null}\n        " + b);
fs.writeFileSync(file, s);
console.log('Patched');
