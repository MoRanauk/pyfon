import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const CK = ['thank-you link', '<p><Link to="/shop">Keep shopping</Link></p>', '<p><Link to="/orders">Track my order</Link></p><p><Link to="/shop">Keep shopping</Link></p>'];
const jobs = [
  { file: 'apps/gift-hub/src/Layout.jsx', edits: [
    ['announce memory', "const [ann, setAnn] = useState(true);", "const [ann, setAnn] = useState(() => { try { return Date.now() - Number(localStorage.getItem('ann_closed') || 0) > 86400000; } catch (e) { return true; } });"],
    ['announce close', 'onClick={() => setAnn(false)}>&times;</button>', "onClick={() => { setAnn(false); try { localStorage.setItem('ann_closed', String(Date.now())); } catch (e) { /* ignore */ } }}>&times;</button>"],
    ['header link', "<Link to=\"/account\">{user ? 'Account' : 'Sign in'}</Link>", "<Link to=\"/account\">{user ? 'Account' : 'Sign in'}</Link>{user ? <Link to=\"/orders\">Orders</Link> : null}"],
    ['footer link', '<Link to="/cart">Your cart</Link>', '<Link to="/cart">Your cart</Link><Link to="/orders">My orders</Link>'],
  ] },
  { file: 'apps/gift-hub/src/Checkout.jsx', edits: [CK] },
  { file: 'apps/trim-atelier/src/Checkout.jsx', edits: [CK] },
];

let miss = false;
const pending = [];
for (const j of jobs) {
  const full = path.join(root, j.file);
  let t = fs.readFileSync(full, 'utf8');
  let changed = false;
  for (const [name, from, to] of j.edits) {
    if (t.includes(to)) { console.log('Already done: ' + j.file + ' / ' + name); continue; }
    if (!t.includes(from)) { console.log('NOT FOUND: ' + j.file + ' / ' + name); miss = true; continue; }
    t = t.replace(from, () => to);
    changed = true;
    console.log('Patched: ' + j.file + ' / ' + name);
  }
  pending.push({ full, t, changed });
}
if (miss) { console.log('FAIL: something was not found, nothing was written'); process.exit(1); }
for (const p of pending) if (p.changed) fs.writeFileSync(p.full, p.t, 'utf8');
console.log('PASS');
