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

const LIST = 'orders.map((o) => <OrderCard key={o.ref} o={o} />)';
const IMP = "import PayPanel from './PayPanel.jsx';\n";
for (const app of ['gift-hub', 'trim-atelier']) {
  patch('apps/' + app + '/src/Orders.jsx', [
    ['import table', "import OrdersTable from './OrdersTable.jsx';", IMP, IMP + "import OrdersTable from './OrdersTable.jsx';\n"],
    ['use table', '<OrdersTable orders', LIST, '<OrdersTable orders={orders} iface={STORE} />'],
  ]);
  patch('apps/' + app + '/src/Checkout.jsx', [
    ['import pay', "import PayPanel from './PayPanel.jsx';", "import { Acc, getShip, setShipPref } from './Bits.jsx';\n", "import { Acc, getShip, setShipPref } from './Bits.jsx';\nimport PayPanel from './PayPanel.jsx';\n"],
    ['pay step', '<PayPanel orderRef', '<p>We will confirm payment and delivery with you on WhatsApp.</p>', '<h2>Pay now</h2>\n        {o.ref ? <PayPanel orderRef={o.ref} iface={STORE} startOpen /> : null}\n        <p>Prefer to pay later? You can pay any time from My orders. We will message you on WhatsApp about delivery.</p>'],
    ['box title', 'Pay with M-Pesa after you place your order', '<p><b>Pay after we confirm on WhatsApp</b></p>', '<p><b>Pay with M-Pesa after you place your order</b></p>'],
    ['box text', 'You do not need to type anything', '<p className="muted" style={{ fontSize: 14 }}>We save your order, then open WhatsApp so we can confirm the price and payment with you. M-Pesa checkout is coming.</p>', '<p className="muted" style={{ fontSize: 14 }}>Place your order, then pay to our till on the next screen. You do not need to type anything. The team confirms your payment and messages you.</p>'],
  ]);
}
patch('apps/mco-brands/src/Orders.jsx', [
  ['import table', "import OrdersTable from './OrdersTable.jsx';", IMP, IMP + "import OrdersTable from './OrdersTable.jsx';\n"],
  ['use table', '<OrdersTable orders', LIST, '<OrdersTable orders={orders} iface="mco" />'],
]);
patch('apps/mco-brands/src/Cart.jsx', [
  ['import pay', "import PayPanel from './PayPanel.jsx';", "import { errText } from './util.js';\n", "import { errText } from './util.js';\nimport PayPanel from './PayPanel.jsx';\n"],
  ['pay step', '<PayPanel orderRef', '<p>You can follow every stage of your order on the site. We will confirm payment and delivery with you.</p>', '<h3>Pay now</h3>\n        {o.ref ? <PayPanel orderRef={o.ref} iface={STORE} startOpen /> : null}\n        <p>You can also pay later from My orders, and follow every stage of your order there.</p>'],
]);

patch('apps/m3labs/src/Payments.jsx', [
  ['tabs row', 'flexDirection', `<div className="bar" style={{ justifyContent: 'center' }}>`, `<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '12px 0' }}>`],
  ['tab buttons', "background: tab === k", `{TABS.map(([k, l]) => <button key={k} type="button" className={'btn' + (tab === k ? '' : ' sm')} onClick={() => setTab(k)}>{l}</button>)}`, `{TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} style={{ padding: '8px 18px', borderRadius: 999, border: '1px solid #0b2a4a', cursor: 'pointer', font: 'inherit', background: tab === k ? '#0b2a4a' : '#fff', color: tab === k ? '#fff' : '#0b2a4a' }}>{l}</button>)}`],
]);

patch('backend/src/routes/partnerPayments.js', [
  ['code reuse rule', 'clash', "const j = await client.query('SELECT ref FROM jobs WHERE order_id = $1', [o.id]);",
   "const clash = await client.query(\n    \"SELECT 1 FROM order_payments p JOIN orders x ON x.id = p.order_id WHERE p.mpesa_code = $1 AND p.status = 'confirmed' AND p.id <> $3 AND (p.order_id = $2 OR x.customer_id <> (SELECT customer_id FROM orders WHERE id = $2)) LIMIT 1\",\n    [mpesaCode, o.id, paymentId]\n  );\n  if (clash.rows[0]) throw new HttpError(409, 'code_used', 'That M-Pesa code is already confirmed on this order or on another customer');\n  const j = await client.query('SELECT ref FROM jobs WHERE order_id = $1', [o.id]);"],
]);

if (bad) { console.log('FAIL: ' + bad + ' problem(s)'); process.exit(1); }
console.log('PASS');
