const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const errors = [];
const writes = [];

function css(file, marker, block, optional) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { if (optional) console.log('Skipped (not found) ' + file); else errors.push('MISSING FILE ' + file); return; }
  const raw = fs.readFileSync(p, 'utf8');
  if (raw.includes(marker)) { console.log('Already done ' + file); return; }
  const crlf = raw.includes('\r\n');
  const add = '\n' + block + '\n';
  writes.push({ p, text: raw + (crlf ? add.replace(/\n/g, '\r\n') : add), label: file + ' (css added)' });
}

function edit(file, pairs) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { errors.push('MISSING FILE ' + file); return; }
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  let changed = 0;
  for (const [o, n] of pairs) {
    if (t.includes(n)) continue;
    const c = t.split(o).length - 1;
    if (c !== 1) { errors.push('NOT FOUND (' + c + ') in ' + file + ': ' + o.slice(0, 70).replace(/\n/g, ' ')); continue; }
    t = t.split(o).join(n);
    changed++;
  }
  writes.push({ p, text: crlf ? t.replace(/\n/g, '\r\n') : t, label: file + (changed ? ' (patched ' + changed + ')' : ' (already done)') });
}

const RAIL = `/* 7c73 rail */
.jx-band{overflow:hidden}
.jx-bandin{grid-template-columns:300px minmax(0,1fr)}
.jx-bandin>*{min-width:0}
.jx-rail{min-width:0;max-width:100%;scroll-snap-type:x proximity;padding-bottom:4px}
.jx-rail a{scroll-snap-align:start}
.jx-track{display:block;position:relative;height:4px;margin-top:16px;border-radius:4px;background:rgba(128,128,128,.3)}
.jx-track i{position:absolute;top:0;bottom:0;border-radius:4px;background:currentColor;opacity:.75}
@media(max-width:900px){
.jx-bandin{grid-template-columns:minmax(0,1fr);gap:20px;padding:0 16px}
.jx-rail{gap:16px}
.jx-rail a{flex:0 0 62%}
}`;
css('apps/gift-hub/src/jx.css', '/* 7c73 rail', RAIL, false);
css('apps/trim-atelier/src/jx.css', '/* 7c73 rail', RAIL, true);

css('apps/mco-brands/src/ot.css', '/* 7c73 wide', `/* 7c73 wide orders page */
.orders.orders-wide{max-width:1400px;width:100%;margin:0 auto;padding:24px 24px 64px;box-sizing:border-box;text-align:center}
.orders.orders-wide .ot{text-align:left}
@media(max-width:700px){.orders.orders-wide{padding:16px 12px 48px}}`, false);

edit('apps/mco-brands/src/Orders.jsx', [
  [`<div className="orders">
      <h1>My orders and quotes</h1>
      {err`, `<div className="orders orders-wide">
      <h1>My orders and quotes</h1>
      {err`],
  [`      <h2>Orders</h2>
      {orders === null ? <p className="muted">Loading...</p> : orders.length === 0 ? <p className="muted">No orders yet.</p> : <OrdersTable orders={orders} iface="mco" />}
      <h2>Quote requests</h2>
      {quotes === null ? <p className="muted">Loading...</p> : quotes.length === 0 ? <p className="muted">No quote requests yet.</p> : quotes.map((q) => <QuoteCard key={q.ref} q={q} />)}`,
   `      {orders === null || quotes === null ? <p className="muted">Loading...</p> : orders.length + quotes.length === 0 ? <p className="muted">No orders yet.</p> : <OrdersTable orders={orders} quotes={quotes} iface="mco" />}`],
]);

edit('apps/mco-brands/src/SiteFooter.jsx', [
  [`<Link to="/cart">My cart</Link>`, `<Link to="/cart">My cart</Link>
            <p style={{ margin: '7px 0', fontSize: 14, opacity: 0.9 }}>Physical Location: Keekorok Road (Store Under Maintenance)</p>`],
]);

if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
for (const w of writes) { fs.writeFileSync(w.p, w.text, 'utf8'); console.log('Patched ' + w.label); }
console.log('PASS: 7c73 patched');
