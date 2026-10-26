const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const BT = String.fromCharCode(96);
const jobs = [];
const edit = (file, pairs) => jobs.push({ file, pairs });
const whole = (file, content) => jobs.push({ file, whole: content });

function checkoutPairs() {
  return [
    [`const SLOTS = ['Morning (8am to 12pm)', 'Afternoon (12pm to 4pm)', 'Evening (4pm to 7pm)'];`,
`const SLOTS = ['Morning (8am to 12pm)', 'Afternoon (12pm to 4pm)', 'Evening (4pm to 7pm)'];

const DRAFT = 'pf_co_draft_' + STORE;
const BILL = 'pf_co_billing_' + STORE;
const BLANK = { name: '', phone: '', email: '', rName: '', rPhone: '', address: '', date: '', slot: SLOTS[0], msg: '', from: '', notes: '' };
function readJson(area, key) { try { const v = JSON.parse(area.getItem(key) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }`],
    [`const [f, setF] = useState({ name: '', phone: '', email: '', rName: '', rPhone: '', address: '', date: '', slot: SLOTS[0], msg: '', from: '', notes: '' });`,
     `const [f, setF] = useState(() => ({ ...BLANK, ...readJson(localStorage, BILL), ...(readJson(sessionStorage, DRAFT).f || {}) }));`],
    [`const [surprise, setSurprise] = useState(false);`,
     `const [surprise, setSurprise] = useState(() => !!readJson(sessionStorage, DRAFT).surprise);`],
    [`const fresh = lines.some((l) => l.fresh);`,
`useEffect(() => { try { sessionStorage.setItem(DRAFT, JSON.stringify({ f, surprise })); } catch (e) { /* ignore */ } }, [f, surprise]);

  const fresh = lines.some((l) => l.fresh);`],
    [`setDone({ order: d.order, url: d.whatsappUrl }); clear();`,
     `try { localStorage.setItem(BILL, JSON.stringify({ name: f.name, phone: f.phone, email: f.email, address: f.address })); sessionStorage.removeItem(DRAFT); } catch (e2) { /* ignore */ }
      setDone({ order: d.order, url: d.whatsappUrl }); clear();`],
    [`'Date: ' + f.date`, `'Delivery date: ' + f.date`],
    [`label="Date *"`, `label="Date of delivery or pickup *"`],
    [`<small>Time</small>`, `<small>Time of delivery or pickup</small>`],
    [`You do not need to type anything. The team confirms your payment and messages you.</p>`,
`You do not need to type anything. The team confirms your payment and messages you.</p>
              <p className="muted" style={{ fontSize: 14 }}><b>Please note: your order will be ready after 24 hours.</b></p>`],
    [`<h2>Pay now</h2>`,
`<p><b>Please note: your order will be ready after 24 hours.</b></p>
        <h2>Pay now</h2>`],
  ];
}
edit('apps/gift-hub/src/Checkout.jsx', checkoutPairs());
edit('apps/trim-atelier/src/Checkout.jsx', checkoutPairs());

edit('apps/mco-brands/src/Cart.jsx', [
  [`<h3>Pay now</h3>`,
`<p><b>Please note: your order will be ready after 24 hours.</b></p>
        <h3>Pay now</h3>`],
  [`<button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place order'}</button>`,
`<p className="muted"><b>Please note: your order will be ready after 24 hours.</b></p>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place order'}</button>`],
]);

whole('backend/src/whatsapp.js', String.raw`const NUMBER = '254794802462';
const STORE_NAMES = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };

const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const link = (text) => 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(text);
const shop = (storefront) => STORE_NAMES[storefront] || 'Pyfon Brands';

export function orderWhatsappUrl({ ref, storefront, contactName, totalKes, lines, deliveryNotes }) {
  const rows = lines.map((l) => '- ' + l.qty + ' x ' + l.name + ' (' + l.sku + ') ' + kes(l.unitPriceKes * l.qty));
  const text = [
    'Hello ' + shop(storefront) + ', I placed order ' + ref + '.',
    ...rows,
    'Total: ' + kes(totalKes),
    'Name: ' + contactName,
    deliveryNotes ? 'Delivery: ' + deliveryNotes : null,
  ].filter(Boolean).join('\n');
  return link(text);
}

export function quoteWhatsappUrl({ ref, storefront, contactName, kind, summary }) {
  const text = [
    'Hello ' + shop(storefront) + ', I sent quote request ' + ref + ' (' + kind + ').',
    summary,
    'Name: ' + contactName,
  ].filter(Boolean).join('\n');
  return link(text);
}
`);

edit('backend/src/delivery.js', [
  [`export const findDelivery = (code) => DELIVERY.find((d) => d.code === code) || null;`,
`export const findDelivery = (code) => DELIVERY.find((d) => d.code === code) || null;

export const SHOP_NAMES = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };

// Same as findDelivery, but the pickup label names the shop the customer ordered from.
export function deliveryFor(code, storefront) {
  const d = findDelivery(code);
  if (!d) return null;
  if (d.code === 'pickup' && SHOP_NAMES[storefront]) return { ...d, label: 'Pick up from ' + SHOP_NAMES[storefront] + ' Shop' };
  return d;
}`],
]);

edit('apps/gift-hub/src/delivery.js', [[`label: 'Pick up from Pyfon Brands'`, `label: 'Pick up from Pyfon Gift Hub Shop'`]]);
edit('apps/trim-atelier/src/delivery.js', [[`label: 'Pick up from Pyfon Brands'`, `label: 'Pick up from TriM Atelier Shop'`]]);
edit('apps/mco-brands/src/delivery.js', [[`label: 'Pick up from Pyfon Brands'`, `label: 'Pick up from M & Co. Brands Shop'`]]);

edit('backend/src/routes/customerOrders.js', [
  [`import { findDelivery } from '../delivery.js';`, `import { findDelivery, deliveryFor } from '../delivery.js';`],
  [`const delivery = findDelivery(body.deliveryMethod);`, `const delivery = deliveryFor(body.deliveryMethod, storefront);`],
  [`+ ' Track your order progress here: '`, `+ ' Please note: your order will be ready after 24 hours.'\n    + ' Track your order progress here: '`],
  [`label: (findDelivery(r.delivery_method) || {}).label || r.delivery_method`, `label: (deliveryFor(r.delivery_method, req.interfaceCode) || {}).label || r.delivery_method`],
  [`WHERE o.customer_id = $1 ORDER BY o.created_at DESC LIMIT 50` + BT + `,\n    [req.user.id]`,
   `WHERE o.customer_id = $1 AND o.storefront_code = $2 ORDER BY o.created_at DESC LIMIT 50` + BT + `,\n    [req.user.id, req.interfaceCode]`],
  [`WHERE q.customer_id = $1 ORDER BY q.created_at DESC LIMIT 50` + BT + `,\n    [req.user.id]`,
   `WHERE q.customer_id = $1 AND q.storefront_code = $2 ORDER BY q.created_at DESC LIMIT 50` + BT + `,\n    [req.user.id, req.interfaceCode]`],
]);

edit('apps/m3labs/src/Activity.jsx', [[`prestige: 'Prestige M shop'`, `prestige: 'Pyfon Gift Hub shop'`]]);
edit('apps/m3labs/src/DevReports.jsx', [[`prestige: 'Prestige M', trim`, `prestige: 'Pyfon Gift Hub', trim`]]);

const LOC = `<a href={wa('Hello, I would like a quote for corporate gifting.')} target="_blank" rel="noreferrer">Corporate gifting</a>`;
const LOCNEW = LOC + `\n              <p style={{ margin: '7px 0', fontSize: 14, opacity: 0.9 }}>Physical Location: Keekorok Road (Store Under Maintenance)</p>`;
edit('apps/gift-hub/src/Layout.jsx', [[LOC, LOCNEW]]);
edit('apps/trim-atelier/src/Layout.jsx', [[LOC, LOCNEW]]);

// ---- run: check everything first, write only if all pass ----
const out = [];
const errors = [];
for (const j of jobs) {
  const p = path.join(root, j.file);
  if (!fs.existsSync(p)) { errors.push('MISSING FILE ' + j.file); continue; }
  let raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  if (j.whole !== undefined) {
    out.push({ p, text: j.whole, crlf: false, label: j.file + ' (replaced)' });
    continue;
  }
  let changed = 0;
  for (const [o, n] of j.pairs) {
    if (t.includes(n)) continue;
    const c = t.split(o).length - 1;
    if (c !== 1) { errors.push('NOT FOUND (' + c + ' matches) in ' + j.file + ': ' + o.slice(0, 70).replace(/\n/g, ' ')); continue; }
    t = t.split(o).join(n);
    changed++;
  }
  out.push({ p, text: t, crlf, label: j.file + (changed ? ' (patched ' + changed + ')' : ' (already done)') });
}
if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
for (const o of out) { fs.writeFileSync(o.p, o.crlf ? o.text.replace(/\n/g, '\r\n') : o.text, 'utf8'); console.log('Patched ' + o.label); }
console.log('PASS: group 1 patched');
