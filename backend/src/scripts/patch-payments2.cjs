const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
let bad = 0;
function patch(rel, pairs) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) { console.log('NOT FOUND file: ' + rel); bad++; return; }
  const raw = fs.readFileSync(f, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  let changed = false;
  for (const [name, test, find, put] of pairs) {
    if (t.includes(test)) { console.log('Already done: ' + rel + ' ' + name); continue; }
    if (!t.includes(find)) { console.log('NOT FOUND: ' + rel + ' ' + name); bad++; return; }
    t = t.replace(find, () => put);
    changed = true;
    console.log('Patched: ' + rel + ' ' + name);
  }
  if (changed) fs.writeFileSync(f, crlf ? t.replace(/\n/g, '\r\n') : t);
}

patch('backend/src/routes/partnerPayments.js', [
  ['store in list', 'o.storefront_code AS store', 'o.ref AS order_ref, o.contact_name, o.contact_phone, o.total_kes, j.ref AS job_ref,', 'o.ref AS order_ref, o.storefront_code AS store, o.contact_name, o.contact_phone, o.total_kes, j.ref AS job_ref,'],
  ['store in shape', 'store: r.store', 'orderRef: r.order_ref,', 'orderRef: r.order_ref, store: r.store,'],
  ['store in order lock', 'contact_email, storefront_code', 'contact_name, contact_phone, contact_email FROM orders WHERE id = $1 FOR UPDATE', 'contact_name, contact_phone, contact_email, storefront_code FROM orders WHERE id = $1 FOR UPDATE'],
  ['store in money note', "' (' + o.storefront_code", "'M-Pesa ' + mpesaCode + ' for ' + o.ref, userId]", "'M-Pesa ' + mpesaCode + ' for ' + o.ref + ' (' + o.storefront_code + ')', userId]"],
]);

patch('apps/m3labs/src/Payments.jsx', [
  ['store names', 'const STORES', 'const TABS = [', "const STORES = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };\nconst TABS = ["],
  ['store badge', 'STORES[p.store]', '<strong>{p.orderRef}</strong>', '<strong>{p.orderRef}</strong> <span className="pill">{STORES[p.store] || p.store}</span>'],
  ['finance hint', 'Find this payment in the till', '<p className="muted">Check the code and amount against the till statement before you confirm.</p>', '<p className="muted">Find this payment in the till messages or statement (look for {p.customer} {p.phone} and the amount), type its M-Pesa code, then confirm.</p>'],
]);

for (const app of fs.readdirSync(path.join(root, 'apps'))) {
  const dir = path.join(root, 'apps', app);
  const pj = path.join(dir, 'package.json');
  if (!fs.existsSync(pj)) continue;
  const hasVite = fs.readdirSync(dir).some((n) => /^vite\.config\./.test(n));
  const j = JSON.parse(fs.readFileSync(pj, 'utf8').replace(/^\uFEFF/, ''));
  j.scripts = j.scripts || {};
  if (hasVite && !j.scripts.build) {
    j.scripts.build = 'vite build';
    fs.writeFileSync(pj, JSON.stringify(j, null, 2) + '\n');
    console.log('Patched: apps/' + app + ' build script');
  } else {
    console.log('Already ok: apps/' + app);
  }
}

if (bad) { console.log('FAIL: ' + bad + ' problem(s)'); process.exit(1); }
console.log('PASS');
