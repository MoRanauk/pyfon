const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const errors = [];
const file = 'apps/m3labs/src/Connect.jsx';
const p = path.join(root, file);
if (!fs.existsSync(p)) { errors.push('MISSING FILE ' + file); }
const PANEL = `function ChannelStatus({ ch }) {
  if (ch === null) return null;
  if (ch === false) return <p className="center muted">Channel status is not available.</p>;
  const state = (on) => <span style={{ color: on ? '#0a7a2f' : '#999' }}>{on ? 'On' : 'Off'}</span>;
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <b>How messages leave the system</b>
      <p className="muted" style={{ margin: '4px 0 8px' }}>Order: WhatsApp, then SMS, then email.</p>
      <div className="mrow"><span className="grow">1. WhatsApp (OpenWA)<br /><span className="muted">{ch.whatsapp.configured ? 'Set up' : 'Not set up'}{' \\u00b7 '}mode: {ch.whatsapp.mode}</span></span>{state(ch.whatsapp.sending)}</div>
      <div className="mrow"><span className="grow">2. SMS gateway<br /><span className="muted">{ch.sms.configured ? 'Set up' : 'Not set up yet'}</span></span>{state(ch.sms.configured)}</div>
      <div className="mrow"><span className="grow">3. Email (safety net)<br /><span className="muted">{ch.email.configured ? 'Brevo set up' : 'Brevo not set up'}</span></span>{state(ch.email.fallback)}</div>
    </div>
  );
}

export default function Connect() {`;
const pairs = [
  [`import { useState } from 'react';`, `import { useEffect, useState } from 'react';`],
  [`export default function Connect() {`, PANEL],
  [`  const [err, setErr] = useState('');`, `  const [err, setErr] = useState('');\n  const [ch, setCh] = useState(null);\n  useEffect(() => { get(P + '/connect/channels').then(setCh).catch(() => setCh(false)); }, []);`],
  [`<p className="center muted">Who do you want to reach?</p>`, `<p className="center muted">Who do you want to reach?</p>\n        <ChannelStatus ch={ch} />`],
];
if (!errors.length) {
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
  if (!errors.length) { fs.writeFileSync(p, crlf ? t.replace(/\n/g, '\r\n') : t, 'utf8'); console.log('Patched ' + file + (changed ? ' (' + changed + ' edits)' : ' (already done)')); }
}
if (errors.length) { errors.forEach((e) => console.log(e)); console.log('FAIL: nothing written'); process.exit(1); }
console.log('PASS: connect status panel patched');
