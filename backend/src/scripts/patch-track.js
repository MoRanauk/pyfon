import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const APP = [
  ['track import', "import Orders from './Orders.jsx';", "import Orders from './Orders.jsx';\nimport Track from './Track.jsx';"],
  ['track route', '<Route path="/orders" element={<Orders />} />', '<Route path="/orders" element={<Orders />} />\n        <Route path="/track" element={<Track />} />'],
];
const ORD = ['orders signed-out link', '<p><Link to="/account?next=/orders">Sign in</Link> to see your orders and quotes.</p>', '<p><Link to="/account?next=/orders">Sign in</Link> to see your orders and quotes.</p>\n        <p>Or <Link to="/track">track an order with its number and phone</Link>.</p>'];
const jobs = [
  { file: 'backend/src/app.js', edits: [
    ['track import', "import { publicContentRoutes } from './routes/siteContent.js';", "import { publicContentRoutes } from './routes/siteContent.js';\nimport { publicTrackRoutes } from './routes/publicTrack.js';"],
    ['track mount', "app.use('/v1/content', publicContentRoutes);", "app.use('/v1/content', publicContentRoutes);\napp.use('/v1/track', publicTrackRoutes);"],
  ] },
  { file: 'apps/prestige-m/src/App.jsx', edits: APP },
  { file: 'apps/trim-atelier/src/App.jsx', edits: APP },
  { file: 'apps/prestige-m/src/Orders.jsx', edits: [ORD] },
  { file: 'apps/trim-atelier/src/Orders.jsx', edits: [ORD] },
  { file: 'apps/prestige-m/src/Layout.jsx', edits: [
    ['footer track', '<Link to="/orders">My orders</Link>', '<Link to="/orders">My orders</Link><Link to="/track">Track my order</Link>'],
  ] },
  { file: 'apps/trim-atelier/src/Layout.jsx', edits: [
    ['announce memory', 'const [ann, setAnn] = useState(true);', "const [ann, setAnn] = useState(() => { try { return Date.now() - Number(localStorage.getItem('ann_closed') || 0) > 86400000; } catch (e) { return true; } });"],
    ['announce close', 'onClick={() => setAnn(false)}>&times;</button>', "onClick={() => { setAnn(false); try { localStorage.setItem('ann_closed', String(Date.now())); } catch (e) { /* ignore */ } }}>&times;</button>"],
    ['header link', "<Link to=\"/account\">{user ? 'Account' : 'Sign in'}</Link>", "<Link to=\"/account\">{user ? 'Account' : 'Sign in'}</Link>{user ? <Link to=\"/orders\">Orders</Link> : null}"],
    ['footer links', '<h4>Customer care</h4>', '<h4>Customer care</h4><Link to="/track">Track my order</Link>{user ? <Link to="/orders">My orders</Link> : null}'],
  ] },
];

let miss = false;
const pending = [];
for (const j of jobs) {
  const full = path.join(root, j.file);
  const raw = fs.readFileSync(full, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let t = raw.replace(/\r\n/g, '\n');
  let changed = false;
  for (const [name, from, to] of j.edits) {
    if (t.includes(to)) { console.log('Already done: ' + j.file + ' / ' + name); continue; }
    if (!t.includes(from)) { console.log('NOT FOUND: ' + j.file + ' / ' + name); miss = true; continue; }
    t = t.replace(from, () => to);
    changed = true;
    console.log('Patched: ' + j.file + ' / ' + name);
  }
  pending.push({ full, t: t.replace(/\n/g, eol), changed });
}
if (miss) { console.log('FAIL: something was not found, nothing was written'); process.exit(1); }
for (const p of pending) if (p.changed) fs.writeFileSync(p.full, p.t, 'utf8');
console.log('PASS');
