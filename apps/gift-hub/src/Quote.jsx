import { useEffect, useState } from 'react';
import PhoneField, { phoneOk, phoneForServer, emailOk } from './PhoneField.jsx';
import { Link, useSearchParams } from 'react-router-dom';
import { TextField } from '@pyfon/ui';
import { api, STORE } from './api.js';
import { useAuth } from './AuthState.jsx';
import { errText } from './util.js';

const PHONE = /^\+?[0-9 ]{9,15}$/;

export default function Quote() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [kind, setKind] = useState(['service', 'bulk', 'corporate', 'design'].includes(params.get('kind')) ? params.get('kind') : 'service');
  const [sku, setSku] = useState(params.get('sku') || '');
  const [options, setOptions] = useState([]);
  const [f, setF] = useState({ contactName: '', contactPhone: '', contactEmail: '', companyName: '', quantity: '', size: '', material: '', finish: '', turnaround: '', notes: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { if (user) setF((s) => ({ ...s, contactEmail: s.contactEmail || user.email || '', contactName: s.contactName || user.fullName || user.full_name || '' })); }, [user]);

  useEffect(() => {
    const first = params.get('sku');
    Promise.all([
      api.catalog.items(STORE, { type: 'service', limit: 60 }),
      first ? api.catalog.item(STORE, first).catch(() => null) : Promise.resolve(null)
    ]).then(([list, one]) => {
      const items = list.items.map((x) => ({ sku: x.sku, name: x.name }));
      if (one && one.item && !items.find((x) => x.sku === one.item.sku)) items.unshift({ sku: one.item.sku, name: one.item.name });
      setOptions(items);
      if (!first && items.length) setSku(items[0].sku);
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (f.contactName.trim().length < 2) return setErr('Enter your name.');
    if (!phoneOk(f.contactPhone)) return setErr('Choose your country and enter a valid phone number.');
    if (!emailOk(f.contactEmail)) return setErr('Enter a valid email address.');
    if (kind === 'corporate' && !f.companyName.trim()) return setErr('Enter the company name.');
    if (kind === 'bulk' && !parseInt(f.quantity, 10)) return setErr('Enter the quantity.');
    if (kind === 'service' && !sku) return setErr('Choose a service.');
    const spec = {};
    ['size', 'material', 'finish', 'turnaround'].forEach((k) => { if (f[k].trim()) spec[k] = f[k].trim(); });
    const body = { kind, contactName: f.contactName.trim(), contactPhone: phoneForServer(f.contactPhone), spec };
    if (sku && kind === 'service') body.sku = sku;
    if (parseInt(f.quantity, 10) > 0) body.quantity = parseInt(f.quantity, 10);
    if (f.companyName.trim()) body.companyName = f.companyName.trim();
    body.contactEmail = f.contactEmail.trim();
    if (f.notes.trim()) body.notes = f.notes.trim();
    setBusy(true);
    try {
      const d = await api.customer.createQuote(body);
      setDone({ ref: d.quoteRequest && d.quoteRequest.ref, url: d.whatsappUrl });
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="wrap section">
        <h2>Quote request sent</h2>
        {done.ref ? <p>Your reference is <strong>{done.ref}</strong>.</p> : null}
        <p>Send it on WhatsApp so we can talk through the details.</p>
        <a className="btn" href={done.url} target="_blank" rel="noreferrer">Send on WhatsApp</a>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wrap section">
        <h2>Request a quote</h2>
        <div className="banner">
          <p>Please sign in first so we can follow your request.</p>
          <Link className="btn" to="/account?next=/quote">Sign in or sign up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap section">
      <h2>Request a quote</h2>
      <form onSubmit={submit} className="formcol">
        <label>What do you need?
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="service">A print or design service</option>
            <option value="bulk">A bulk order</option>
            <option value="corporate">Corporate branding</option>
            <option value="design">We design it for you</option>
          </select>
        </label>
        {kind === 'service' ? (
          <label>Service
            <select value={sku} onChange={(e) => setSku(e.target.value)}>
              {options.map((o) => <option key={o.sku} value={o.sku}>{o.name}</option>)}
            </select>
          </label>
        ) : null}
        <TextField label="Full name" value={f.contactName} onChange={set('contactName')} />
        <PhoneField label="Phone (for WhatsApp)" onChange={(v) => setF((s) => ({ ...s, contactPhone: v }))} />
        <TextField label="Email" type="email" value={f.contactEmail} onChange={set('contactEmail')} />
        {kind === 'corporate' ? <TextField label="Company name" value={f.companyName} onChange={set('companyName')} /> : null}
        <TextField label={kind === 'bulk' ? 'Quantity' : 'Quantity (optional)'} type="number" value={f.quantity} onChange={set('quantity')} />
        <TextField label="Size (optional)" value={f.size} onChange={set('size')} />
        <TextField label="Material (optional)" value={f.material} onChange={set('material')} />
        <TextField label="Finish (optional)" value={f.finish} onChange={set('finish')} />
        <TextField label="Turnaround (optional)" value={f.turnaround} onChange={set('turnaround')} />
        <TextField label="Notes (optional)" value={f.notes} onChange={set('notes')} />
        {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send quote request'}</button>
      </form>
    </div>
  );
}
