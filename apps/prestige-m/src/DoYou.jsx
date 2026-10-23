import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './jx.css';
import './dy.css';
import { API_URL, tokens } from './api.js';
import { useAuth } from './store.jsx';
import { errText, normPhone } from './lib.js';

const TYPES = ['Mug', 'Water bottle or flask', 'Tumbler', 'T-shirt', 'Hoodie', 'Cap', 'Tote bag', 'Keyholder', 'Notebook or diary', 'Pen', 'Gift set', 'Something else'];
const NEXT = '/account?next=' + encodeURIComponent('/c/personalised?node=do-you');

export default function DoYou() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [type, setType] = useState('');
  const [f, setF] = useState({ qty: '1', print: '', details: '', date: '', name: '', phone: '', email: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const up = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  useEffect(() => { if (user) setF((s) => ({ ...s, email: s.email || user.email || '', name: s.name || user.fullName || user.full_name || '' })); }, [user]);

  const fld = (label, k, p) => <label className="jx-lab"><small>{label}</small><input className="jx-in" value={f[k]} onChange={up(k)} {...(p || {})} /></label>;

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!type) return setErr('Choose what you want us to make.');
    const qty = parseInt(f.qty, 10);
    if (!qty || qty < 1 || qty > 100000) return setErr('Enter how many you need.');
    if (f.print.trim().length < 2 && f.details.trim().length < 2) return setErr('Tell us what to print: a name, a quote, or describe your design.');
    if (!user) return nav(NEXT);
    const ph = normPhone(f.phone);
    if (f.name.trim().length < 2) return setErr('Enter your name.');
    if (!ph) return setErr('Enter a valid phone number, like 0712345678.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address.');
    const notes = ['DESIGN YOUR OWN', 'Product: ' + type, f.print.trim() ? 'Print: ' + f.print.trim() : '', f.details.trim() ? 'Details: ' + f.details.trim() : '', f.date ? 'Needed by: ' + f.date : ''].filter(Boolean).join('. ').slice(0, 2000);
    const body = { kind: 'design', quantity: qty, contactName: f.name.trim(), contactPhone: ph, contactEmail: f.email.trim(), notes };
    if (f.date) body.spec = { turnaround: 'Needed by ' + f.date };
    setBusy(true);
    try {
      const res = await fetch(API_URL + '/v1/customer/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokens.get(), 'X-Interface': 'prestige' },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const det = d.error && Array.isArray(d.error.details) && d.error.details[0];
        throw new Error((det && det.message) || (d.error && d.error.message) || 'Something went wrong. Try again.');
      }
      setDone({ ref: d.quoteRequest && d.quoteRequest.ref, url: d.whatsappUrl });
    } catch (ex) { setErr(ex && ex.message ? ex.message : errText(ex)); }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="jx"><div className="dy-done">
        <h1>Your design request is in</h1>
        {done.ref ? <p>Your reference is <b>{done.ref}</b>.</p> : null}
        <p>Send us your photo, logo or sketch on WhatsApp and quote this reference. We will reply with a price.</p>
        <p><a className="jx-btn" href={done.url} target="_blank" rel="noreferrer">Send it on WhatsApp</a></p>
        <p><Link to="/c/personalised">Back to Personalised</Link></p>
      </div></div>
    );
  }

  return (
    <div className="jx"><div className="dy-wrap">
      <h1>Design your own</h1>
      <p className="dy-lead">Tell us what you want. We design it, show you a mockup, then print it.</p>
      <form onSubmit={submit}>
        <h2>1. What should we make?</h2>
        <div className="dy-tiles">{TYPES.map((t) => <button type="button" key={t} className={'dy-tile' + (type === t ? ' on' : '')} onClick={() => setType(t)}>{t}</button>)}</div>
        <h2>2. Your design</h2>
        {fld('How many do you need? *', 'qty', { type: 'number', min: 1 })}
        {fld('Name, text or quote to print', 'print', { maxLength: 200, placeholder: 'For example: Best Mum Ever' })}
        <label className="jx-lab"><small>Describe your idea (colours, style, sizes)</small><textarea className="jx-in" maxLength={800} value={f.details} onChange={up('details')} /></label>
        {fld('Needed by (optional)', 'date', { type: 'date', min: today })}
        <h2>3. Your details</h2>
        {fld('Full name *', 'name')}
        {fld('Phone (WhatsApp) *', 'phone', { placeholder: '0712345678' })}
        {fld('Email address *', 'email', { type: 'email' })}
        {err ? <p className="err" role="alert">{err}</p> : null}
        <button className="jx-bar" type="submit" disabled={busy}>{busy ? 'Sending...' : user ? 'Send my design request' : 'Sign in to send'}</button>
      </form>
    </div></div>
  );
}
