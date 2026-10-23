import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const CO = [
  ['coupon import', `import { buildStages } from '../jobs/tracking.js';`, `import { buildStages } from '../jobs/tracking.js';\nimport { checkCoupon } from '../coupons.js';`],
  ['coupon schema', `  deliveryAddress: shortText(300).optional(),`, `  deliveryAddress: shortText(300).optional(),\n  couponCode: z.string().trim().max(30).optional(),`],
  ['total let', `const totalKes = itemsKes + (feeKes || 0);`, `let totalKes = itemsKes + (feeKes || 0);\n  let discountKes = 0;\n  let couponUsed = null;`],
  ['coupon lock', `    const o = await client.query(`, `    if (body.couponCode) {\n      couponUsed = await checkCoupon(client, body.couponCode, storefront, req.user.id, itemsKes, true);\n      discountKes = couponUsed.discountKes;\n      totalKes = itemsKes - discountKes + (feeKes || 0);\n    }\n    const o = await client.query(`],
  ['insert cols', `delivery_method, delivery_fee_kes, delivery_address)`, `delivery_method, delivery_fee_kes, delivery_address, coupon_code, discount_kes)`],
  ['insert vals', `$9, $10) RETURNING id, ref`, `$9, $10, $11, $12) RETURNING id, ref`],
  ['insert params', `delivery.code, feeKes, body.deliveryAddress ?? null]`, `delivery.code, feeKes, body.deliveryAddress ?? null, couponUsed ? couponUsed.code : null, discountKes]`],
  ['redeem', `    const order = o.rows[0];`, `    const order = o.rows[0];\n    if (couponUsed) {\n      await client.query('INSERT INTO coupon_redemptions (coupon_id, order_id, user_id, discount_kes) VALUES ($1, $2, $3, $4)', [couponUsed.id, order.id, req.user.id, discountKes]);\n      await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [couponUsed.id]);\n    }`],
  ['response', `      deliveryFeeKes: feeKes,`, `      deliveryFeeKes: feeKes,\n      discountKes,\n      couponCode: couponUsed ? couponUsed.code : null,`],
];
const GR = [
  ['import customer', `import { customerFileRoutes } from './customerFiles.js';`, `import { customerFileRoutes } from './customerFiles.js';\nimport { customerCouponRoutes } from './customerCoupons.js';`],
  ['import partner', `import { partnerBrowseRoutes } from './partnerBrowse.js';`, `import { partnerBrowseRoutes } from './partnerBrowse.js';\nimport { partnerCouponRoutes } from './partnerCoupons.js';`],
  ['mount customer', `customerRoutes.use(customerFileRoutes);`, `customerRoutes.use(customerFileRoutes);\ncustomerRoutes.use(customerCouponRoutes);`],
  ['mount partner', `partnerRoutes.use('/catalog', partnerBrowseRoutes);`, `partnerRoutes.use('/catalog', partnerBrowseRoutes);\npartnerRoutes.use('/coupons', partnerCouponRoutes);`],
];
const CK = [
  ['api import', `import { api, STORE } from './api.js';`, `import { api, STORE, API_URL, tokens } from './api.js';`],
  ['preview fn', `const SLOTS = ['Morning (8am to 12pm)', 'Afternoon (12pm to 4pm)', 'Evening (4pm to 7pm)'];`,
`async function previewCoupon(code, itemsKes) {
  const t = await tokens.get();
  const r = await fetch(API_URL + '/v1/customer/coupons/check', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interface': STORE, Authorization: 'Bearer ' + t }, body: JSON.stringify({ code, itemsKes }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 429 ? 'Too many tries. Please wait a few minutes.' : (j.error && j.error.message) || 'Could not check the coupon.');
  return j;
}

const SLOTS = ['Morning (8am to 12pm)', 'Afternoon (12pm to 4pm)', 'Evening (4pm to 7pm)'];`],
  ['state', `  const [done, setDone] = useState(null);`, `  const [done, setDone] = useState(null);\n  const [cp, setCp] = useState('');\n  const [applied, setApplied] = useState(null);\n  const [cpMsg, setCpMsg] = useState('');`],
  ['disc', `  const fee = del.feeKes;`, `  const fee = del.feeKes;\n  const disc = applied ? Math.min(applied.discountKes, total) : 0;`],
  ['apply fn', `  async function submit(e) {`, `  async function applyCoupon() {\n    setCpMsg('');\n    if (!user) { setApplied(null); return setCpMsg('Sign in first, then apply your code.'); }\n    try { setApplied(await previewCoupon(cp, total)); } catch (ex) { setApplied(null); setCpMsg(ex.message); }\n  }\n\n  async function submit(e) {`],
  ['body', `deliveryMethod: del.code, deliveryNotes: notes,`, `deliveryMethod: del.code, deliveryNotes: notes, couponCode: applied ? applied.code : undefined,`],
  ['coupon box', `<Acc title="Have a coupon? Click here to enter your code"><p>Coupon codes are not switched on yet.</p></Acc>`,
   `<Acc title="Have a coupon? Click here to enter your code"><div style={{ display: 'flex', gap: 8 }}><input className="jx-in" value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" /><button type="button" className="jx-btn" onClick={applyCoupon}>Apply</button></div>{applied ? <p>Coupon <b>{applied.code}</b> applied. You save {formatKES(applied.discountKes)}.</p> : null}{cpMsg ? <p className="err" role="alert">{cpMsg}</p> : null}</Acc>`],
  ['total row', `<tr><th>Total</th><td><b>{formatKES(total + (fee || 0))}</b>{fee == null ? ' + delivery' : ''}</td></tr>`,
   `{disc ? <tr><th>Coupon</th><td>-{formatKES(disc)}</td></tr> : null}\n              <tr><th>Total</th><td><b>{formatKES(total - disc + (fee || 0))}</b>{fee == null ? ' + delivery' : ''}</td></tr>`],
  ['done line', `{o.ref ? <p>Your order reference is <b>{o.ref}</b>.</p> : null}`, `{o.ref ? <p>Your order reference is <b>{o.ref}</b>.</p> : null}\n        {o.discountKes ? <p>Coupon {o.couponCode} saved you {formatKES(o.discountKes)}.</p> : null}`],
];
const jobs = [
  { file: 'backend/src/routes/customerOrders.js', edits: CO },
  { file: 'backend/src/routes/groups.js', edits: GR },
  { file: 'apps/prestige-m/src/Checkout.jsx', edits: CK },
  { file: 'apps/trim-atelier/src/Checkout.jsx', edits: CK },
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
