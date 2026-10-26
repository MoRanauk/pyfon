import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const CART_NEW = 'Enter your coupon code at the next step (checkout). Your discount is shown there.';
const CART_RE = /Coupon codes? (?:are|is) not[^<{}]*?\./i;
const jobs = [
  { file: 'apps/gift-hub/src/Cart.jsx', cart: true },
  { file: 'apps/trim-atelier/src/Cart.jsx', cart: true },
  { file: 'apps/mco-brands/src/App.jsx', edits: [
    ['track import', "import Orders from './Orders.jsx';", "import Orders from './Orders.jsx';\nimport Track from './Track.jsx';"],
    ['track route', '<Route path="/orders" element={<Orders />} />', '<Route path="/orders" element={<Orders />} />\n        <Route path="/track" element={<Track />} />'],
  ] },
  { file: 'apps/mco-brands/src/Orders.jsx', edits: [
    ['signed-out link', '<p><Link to="/account?next=/orders">Sign in</Link> to see your orders and quotes.</p>', '<p><Link to="/account?next=/orders">Sign in</Link> to see your orders and quotes.</p>\n        <p>Or <Link to="/track">track an order with its number and phone</Link>.</p>'],
  ] },
  { file: 'apps/mco-brands/src/SiteFooter.jsx', edits: [
    ['footer links', '<Link to="/account">My account</Link>', '<Link to="/account">My account</Link>\n            <Link to="/orders">My orders</Link>\n            <Link to="/track">Track my order</Link>'],
  ] },
  { file: 'apps/m3labs/src/App.jsx', edits: [
    ['import', "import Approvals from './Approvals.jsx';", "import Approvals from './Approvals.jsx';\nimport Coupons from './Coupons.jsx';"],
    ['route', '<Route path="/approvals" element={<Approvals />} />', '<Route path="/approvals" element={<Approvals />} />\n        <Route path="/coupons" element={<Coupons />} />'],
  ] },
  { file: 'apps/m3labs/src/partnerNav.js', edits: [
    ['menu', "['/videos', 'Videos', true],", "['/videos', 'Videos', true], ['/coupons', 'Coupons', true],"],
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
  if (j.cart) {
    if (t.includes(CART_NEW)) console.log('Already done: ' + j.file);
    else if (CART_RE.test(t)) { t = t.replace(CART_RE, () => CART_NEW); changed = true; console.log('Patched: ' + j.file + ' / cart coupon text'); }
    else {
      console.log('NOT FOUND: ' + j.file + ' / lines that mention coupon:');
      t.split('\n').forEach((l, i) => { if (/coupon/i.test(l)) console.log('  ' + (i + 1) + ': ' + l.trim().slice(0, 160)); });
      miss = true;
    }
  } else {
    for (const [name, from, to] of j.edits) {
      if (t.includes(to)) { console.log('Already done: ' + j.file + ' / ' + name); continue; }
      if (!t.includes(from)) { console.log('NOT FOUND: ' + j.file + ' / ' + name); miss = true; continue; }
      t = t.replace(from, () => to);
      changed = true;
      console.log('Patched: ' + j.file + ' / ' + name);
    }
  }
  pending.push({ full, t: t.replace(/\n/g, eol), changed });
}
if (miss) { console.log('FAIL: something was not found, nothing was written'); process.exit(1); }
for (const p of pending) if (p.changed) fs.writeFileSync(p.full, p.t, 'utf8');
console.log('PASS');
