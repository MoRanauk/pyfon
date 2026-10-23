import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const F = 'apps/mco-brands/src/Cart.jsx';
const edits = [
  ['api import', "import { api, img } from './api.js';", "import { api, img, API_URL, STORE, tokens } from './api.js';"],
  ['preview fn', "const PHONE = /^\\+?[0-9 ]{9,15}$/;",
"const PHONE = /^\\+?[0-9 ]{9,15}$/;\n\nasync function previewCoupon(code, itemsKes) {\n  const t = await tokens.get();\n  const r = await fetch(API_URL + '/v1/customer/coupons/check', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interface': STORE, Authorization: 'Bearer ' + t }, body: JSON.stringify({ code, itemsKes }) });\n  const j = await r.json().catch(() => ({}));\n  if (!r.ok) throw new Error(r.status === 429 ? 'Too many tries. Please wait a few minutes.' : (j.error && j.error.message) || 'Could not check the coupon.');\n  return j;\n}"],
  ['state', "  const [done, setDone] = useState(null);", "  const [done, setDone] = useState(null);\n  const [cp, setCp] = useState('');\n  const [applied, setApplied] = useState(null);\n  const [cpMsg, setCpMsg] = useState('');"],
  ['grand', "  const grand = total + (fee || 0);", "  const disc = applied ? Math.min(applied.discountKes, total) : 0;\n  const grand = total - disc + (fee || 0);"],
  ['apply fn', "  async function submit(e) {", "  async function applyCoupon() {\n    setCpMsg('');\n    try { setApplied(await previewCoupon(cp, total)); } catch (ex) { setApplied(null); setCpMsg(ex.message); }\n  }\n\n  async function submit(e) {"],
  ['body', "        deliveryMethod: method,", "        deliveryMethod: method,\n        couponCode: applied ? applied.code : undefined,"],
  ['coupon box', '          <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />',
'          <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />\n          <div>\n            <div style={{ display: \'flex\', gap: 8 }}>\n              <input value={cp} onChange={(e) => setCp(e.target.value)} onKeyDown={(e) => { if (e.key === \'Enter\') { e.preventDefault(); applyCoupon(); } }} placeholder="Coupon code" aria-label="Coupon code" style={{ flex: 1 }} />\n              <button type="button" className="btn" onClick={applyCoupon}>Apply</button>\n            </div>\n            {applied ? <p>Coupon <strong>{applied.code}</strong> applied. You save {formatKES(applied.discountKes)}.</p> : null}\n            {cpMsg ? <p role="alert" style={{ color: \'#b00020\' }}>{cpMsg}</p> : null}\n          </div>'],
  ['discount row', '            <div className="sumrow"><span>Items</span><span>{formatKES(total)}</span></div>', '            <div className="sumrow"><span>Items</span><span>{formatKES(total)}</span></div>\n            {disc ? <div className="sumrow"><span>Coupon</span><span>-{formatKES(disc)}</span></div> : null}'],
  ['done line', '        {o.ref ? <p>Your order reference is <strong>{o.ref}</strong>.</p> : null}', '        {o.ref ? <p>Your order reference is <strong>{o.ref}</strong>.</p> : null}\n        {o.discountKes ? <p>Coupon {o.couponCode} saved you {formatKES(o.discountKes)}. Your total is {o.totalKes != null ? formatKES(o.totalKes) : \'shown on WhatsApp\'}.</p> : null}'],
];
const full = path.join(root, F);
const raw = fs.readFileSync(full, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let t = raw.replace(/\r\n/g, '\n');
let miss = false;
let changed = false;
for (const [name, from, to] of edits) {
  if (t.includes(to)) { console.log('Already done: ' + name); continue; }
  if (!t.includes(from)) { console.log('NOT FOUND: ' + name); miss = true; continue; }
  t = t.replace(from, () => to);
  changed = true;
  console.log('Patched: ' + name);
}
if (miss) { console.log('FAIL: nothing was written'); process.exit(1); }
if (changed) fs.writeFileSync(full, t.replace(/\n/g, eol), 'utf8');
console.log('PASS');
