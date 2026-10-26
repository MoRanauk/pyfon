const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const errors = [];
const writes = [];

function css(file, marker, block) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) { errors.push('MISSING FILE ' + file); return; }
  const raw = fs.readFileSync(p, 'utf8');
  if (raw.includes(marker)) { console.log('Already done ' + file); return; }
  const crlf = raw.includes('\r\n');
  const add = ('\n' + block + '\n');
  writes.push({ p, text: raw + (crlf ? add.replace(/\n/g, '\r\n') : add), label: file + ' (css added)' });
}

css('apps/gift-hub/src/bl.css', '/* 7c72 mobile', `/* 7c72 mobile fixes */
html,body{overflow-x:clip;max-width:100%}
.mood-root,.page{overflow-x:clip;max-width:100vw}
@media(max-width:700px){
.h1row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px}
.h1row .logo{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:20px}
.h1row .hico{flex:0 0 auto;gap:10px;font-size:12px;white-space:nowrap}
.h1row .hico a{white-space:nowrap}
.bl-burger{width:32px;height:32px;padding:6px}
.h2row{padding:0 12px 6px}
}`);

css('apps/mco-brands/src/styles.css', '/* 7c72 mobile', `/* 7c72 mobile fixes */
html,body{overflow-x:clip;max-width:100%}
.mood-root{overflow-x:clip;max-width:100vw}
@media(max-width:900px){
.hrow{flex-wrap:wrap;row-gap:8px}
.hrow:not(.lite) .searchwrap{order:10;flex:1 0 100%;max-width:none}
.hrow>.logo{flex:1 1 auto;min-width:0}
.hlinks{flex:0 0 auto;gap:10px}
.cartlink{flex:0 0 auto}
}`);

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
    if (c !== 1) { errors.push('NOT FOUND (' + c + ') in ' + file + ': ' + o.slice(0, 70)); continue; }
    t = t.split(o).join(n);
    changed++;
  }
  writes.push({ p, text: crlf ? t.replace(/\n/g, '\r\n') : t, label: file + (changed ? ' (patched ' + changed + ')' : ' (already done)') });
}

edit('backend/src/mail.js', [
  [`export async function sendEmail({ to, subject, text, html }) {`, `export async function sendEmail({ to, subject, text, html, fromName }) {`],
  [`sender: { name: process.env.BREVO_SENDER_NAME || 'Pyfon Brands', email: from },`, `sender: { name: fromName || process.env.BREVO_SENDER_NAME || 'Pyfon Brands', email: from },`],
]);

edit('backend/src/routes/partnerApplications.js', [
  [`import { sendEmail } from '../mail.js';`,
`import { sendEmail } from '../mail.js';

// Emails to an applicant come from the shop they applied on.
const SHOP_LABEL = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };
const shopOf = (a) => SHOP_LABEL[a.shop] || 'Pyfon Brands';`],
  [`subject: 'Your Pyfon Brands dealer invitation',`, `fromName: shopOf(a),\n    subject: 'Your ' + shopOf(a) + ' dealer invitation',`],
  [`'Thank you for applying to work with Pyfon Brands. We would like to welcome you as a dealer.'`, `'Thank you for applying to work with ' + shopOf(a) + '. We would like to welcome you as a dealer.'`],
  [`'If you did not apply, you can ignore this email.', '', 'Pyfon Brands']`, `'If you did not apply, you can ignore this email.', '', shopOf(a)]`],
  [`subject: 'Your application to Pyfon Brands',`, `fromName: shopOf(a),\n      subject: 'Your application to ' + shopOf(a),`],
  [`'Thank you for your interest in working with Pyfon Brands. We are not able to take your application forward right now.'`, `'Thank you for your interest in working with ' + shopOf(a) + '. We are not able to take your application forward right now.'`],
  [`'We wish you every success.', '', 'Pyfon Brands']`, `'We wish you every success.', '', shopOf(a)]`],
  [`subject: 'Message from Pyfon Brands',`, `fromName: shopOf(a),\n      subject: 'Message from ' + shopOf(a),`],
  [`b.message, '', 'Pyfon Brands']`, `b.message, '', shopOf(a)]`],
]);

if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
for (const w of writes) { fs.writeFileSync(w.p, w.text, 'utf8'); console.log('Patched ' + w.label); }
console.log('PASS: group 2 css and group 3 dealer emails patched');
