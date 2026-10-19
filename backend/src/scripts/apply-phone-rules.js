import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const web = path.join(root, 'apps', 'mco-brands', 'src');
let bad = 0;

function patch(file, pairs) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  let t = raw.replace(/\r\n/g, '\n');
  const name = path.basename(file);
  for (const [a, b] of pairs) {
    const hasOld = t.includes(a);
    const hasNew = t.includes(b);
    if (hasNew && (!hasOld || b.includes(a))) { console.log('Already done:', name); continue; }
    if (!hasOld) { console.log('NOT FOUND in', name, '->', a.slice(0, 60)); bad += 1; continue; }
    t = t.replace(a, () => b);
    console.log('Patched:', name);
  }
  fs.writeFileSync(file, crlf ? t.replace(/\n/g, '\r\n') : t);
}

const IMP = String.raw`import PhoneField, { phoneOk, phoneForServer, emailOk } from './PhoneField.jsx';`;
const REACT = String.raw`import { useState } from 'react';`;
const REACT2 = String.raw`import { useEffect, useState } from 'react';`;
const PHONE_FIELD = String.raw`<TextField label="Phone (for WhatsApp)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />`;
const EMAIL_FIELD = String.raw`<TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />`;

function orderForm(file) {
  patch(path.join(web, file), [
    [REACT, REACT2 + '\n' + IMP],
    [String.raw`if (!PHONE.test(phone.trim())) return setErr('Enter a valid phone number, 9 to 15 digits.');`,
     String.raw`if (!phoneOk(phone)) return setErr('Choose your country and enter a valid phone number.');
    if (!emailOk(email)) return setErr('Enter a valid email address.');`],
    [String.raw`contactPhone: phone.trim(),`, String.raw`contactPhone: phoneForServer(phone),`],
    [String.raw`if (email.trim()) body.contactEmail = email.trim();`, String.raw`body.contactEmail = email.trim();`],
    [PHONE_FIELD, String.raw`<PhoneField label="Phone (for WhatsApp)" onChange={setPhone} />`],
    [EMAIL_FIELD, String.raw`<TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />`],
    [String.raw`const [done, setDone] = useState(null);`,
     String.raw`const [done, setDone] = useState(null);
  useEffect(() => { if (user) { setEmail((v) => v || user.email || ''); setName((v) => v || user.fullName || user.full_name || ''); } }, [user]);`],
  ]);
}
orderForm('Cart.jsx');
orderForm('CoBrand.jsx');

patch(path.join(web, 'Quote.jsx'), [
  [REACT2, REACT2 + '\n' + IMP],
  [String.raw`if (!PHONE.test(f.contactPhone.trim())) return setErr('Enter a valid phone number, 9 to 15 digits.');`,
   String.raw`if (!phoneOk(f.contactPhone)) return setErr('Choose your country and enter a valid phone number.');
    if (!emailOk(f.contactEmail)) return setErr('Enter a valid email address.');`],
  [String.raw`contactPhone: f.contactPhone.trim(),`, String.raw`contactPhone: phoneForServer(f.contactPhone),`],
  [String.raw`if (f.contactEmail.trim()) body.contactEmail = f.contactEmail.trim();`, String.raw`body.contactEmail = f.contactEmail.trim();`],
  [String.raw`<TextField label="Phone (for WhatsApp)" value={f.contactPhone} onChange={set('contactPhone')} />`,
   String.raw`<PhoneField label="Phone (for WhatsApp)" onChange={(v) => setF((s) => ({ ...s, contactPhone: v }))} />`],
  [String.raw`<TextField label="Email (optional)" value={f.contactEmail} onChange={set('contactEmail')} />`,
   String.raw`<TextField label="Email" type="email" value={f.contactEmail} onChange={set('contactEmail')} />`],
  [String.raw`const set = (k) => (e) => setF({ ...f, [k]: e.target.value });`,
   String.raw`const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { if (user) setF((s) => ({ ...s, contactEmail: s.contactEmail || user.email || '', contactName: s.contactName || user.fullName || user.full_name || '' })); }, [user]);`],
]);

patch(path.join(web, 'Sell.jsx'), [
  [REACT, REACT + '\n' + IMP],
  [String.raw`if (!PHONE.test(f.phone.trim())) return setErr('Enter a valid phone number, 9 to 15 digits.');`,
   String.raw`if (!phoneOk(f.phone)) return setErr('Choose your country and enter a valid phone number.');`],
  [String.raw`<TextField label="Phone (WhatsApp)" value={f.phone} onChange={set('phone')} />`,
   String.raw`<PhoneField label="Phone (WhatsApp)" onChange={(v) => setF((s) => ({ ...s, phone: v }))} />`],
]);

patch(path.join(web, 'Account.jsx'), [
  [REACT, REACT + '\n' + IMP],
  [String.raw`if (mode === 'up' && password.length < 10) return setErr('Password must be at least 10 characters.');`,
   String.raw`if (mode === 'up' && !phoneOk(phone)) return setErr('Choose your country and enter a valid phone number.');
    if (mode === 'up' && password.length < 10) return setErr('Password must be at least 10 characters.');`],
  [String.raw`{mode === 'up' ? <TextField label="Phone (optional, for SMS or WhatsApp password codes)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /> : null}`,
   String.raw`{mode === 'up' ? <PhoneField label="Phone (for order updates and password codes)" onChange={setPhone} /> : null}`],
]);

patch(path.join(root, 'backend', 'src', 'routes', 'auth.js'), [
  [String.raw`phone: z.string().trim().max(20).optional()`, String.raw`phone: z.string().trim().min(8, 'Enter your phone number').max(20)`],
  [String.raw`phone = normalizePhone(data.phone);`, String.raw`phone = cleanPhone(data.phone);`],
  [String.raw`Enter a Kenyan phone number like 0712345678`, String.raw`Enter a valid phone number with its country code`],
  [String.raw`const profile = (u) => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role, stage: u.partner_stage });`,
   String.raw`const profile = (u) => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role, stage: u.partner_stage });

function cleanPhone(raw) {
  const s = String(raw).replace(/[\s()-]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  if (s.startsWith('+254')) return /^\+254[17]\d{8}$/.test(s) ? normalizePhone('0' + s.slice(4)) : null;
  return s;
}`],
]);

console.log(bad ? 'FAIL: ' + bad + ' patch(es) not found' : 'PASS: all patches applied');
process.exit(bad ? 1 : 0);
