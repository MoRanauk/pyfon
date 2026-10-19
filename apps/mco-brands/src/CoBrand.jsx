import { useEffect, useState } from 'react';
import PhoneField, { phoneOk, phoneForServer, emailOk } from './PhoneField.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { TextField } from '@pyfon/ui';
import { api } from './api.js';
import { useAuth } from './AuthState.jsx';
import { errText } from './util.js';

const PHONE = /^\+?[0-9 ]{9,15}$/;
const KINDS = [
  { code: 'visit', title: 'A designer visits you', text: 'Our designer comes to your office or shop, sees the space and your products, and sketches ideas with you.' },
  { code: 'share', title: 'Share your design', text: 'Already have a logo or artwork? Tell us what to brand and we check it before we print.' },
  { code: 'design', title: 'We design it for you', text: 'Give us a name, quote, logo or photo and we create the design.' },
  { code: 'quote', title: 'Need a price quote?', text: 'Printing, signage, bulk or corporate orders. Tell us what you need and we quote.' }
];

export default function CoBrand() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [kind, setKind] = useState('visit');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [place, setPlace] = useState('');
  const [when, setWhen] = useState('');
  const [details, setDetails] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => { if (user) { setEmail((v) => v || user.email || ''); setName((v) => v || user.fullName || user.full_name || ''); } }, [user]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Enter your name.');
    if (!phoneOk(phone)) return setErr('Choose your country and enter a valid phone number.');
    if (!emailOk(email)) return setErr('Enter a valid email address.');
    if (kind === 'visit' && place.trim().length < 5) return setErr('Tell us where the designer should come.');
    if (kind !== 'visit' && details.trim().length < 5) return setErr('Tell us a little about what you need.');
    const picked = KINDS.find((k) => k.code === kind);
    const parts = ['Co. Brand: ' + picked.title];
    if (kind === 'visit') {
      parts.push('Place: ' + place.trim());
      if (when.trim()) parts.push('Preferred time: ' + when.trim());
    }
    if (details.trim()) parts.push('Details: ' + details.trim());
    setBusy(true);
    try {
      const body = { kind: 'design', contactName: name.trim(), contactPhone: phoneForServer(phone), notes: parts.join(' | ').slice(0, 2000), spec: {} };
      body.contactEmail = email.trim();
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
        <h2>Request received</h2>
        {done.ref ? <p>Your reference is <strong>{done.ref}</strong>.</p> : null}
        <p>Last step: message us on WhatsApp. You can send your logo, photos or design files there.</p>
        <a className="btn" href={done.url} target="_blank" rel="noreferrer">Send on WhatsApp</a>
        <p><Link to="/">Back to home</Link></p>
      </div>
    );
  }

  return (
    <div className="wrap section">
      <h2>Co. Brand</h2>
      <p className="muted">Your brand on everything, designed with you. Choose how you want to start.</p>
      <div className="paths">
        {KINDS.map((k) => (
          <button type="button" key={k.code} className={'card2 pick' + (kind === k.code ? ' on' : '')} onClick={() => (k.code === 'quote' ? nav('/quote') : setKind(k.code))}>
            <h3>{k.title}</h3>
            <p className="muted">{k.text}</p>
          </button>
        ))}
      </div>

      {!user ? (
        <div className="banner">
          <p>Please sign in so we can keep your request safe and let you follow it.</p>
          <Link className="btn" to="/account?next=/co-brand">Sign in or sign up</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="formcol">
          <h3>Your details</h3>
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <PhoneField label="Phone (for WhatsApp)" onChange={setPhone} />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {kind === 'visit' ? (
            <>
              <TextField label="Where should the designer come?" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Building, street, area, town" />
              <TextField label="Preferred day and time (optional)" value={when} onChange={(e) => setWhen(e.target.value)} placeholder="For example Tuesday morning" />
            </>
          ) : null}
          <label className="fld">
            <span>{kind === 'visit' ? 'What do you want branded? (optional)' : 'What do you need?'}</span>
            <textarea rows={4} maxLength={1500} value={details} onChange={(e) => setDetails(e.target.value)} />
          </label>
          {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
        </form>
      )}
    </div>
  );
}
