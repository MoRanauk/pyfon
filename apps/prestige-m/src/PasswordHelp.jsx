import { useState } from 'react';
import { API_URL, STORE } from './api.js';

// Sits inside the sign-in form. It must stay a file-level component (not defined inside another one).
export default function PasswordHelp() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setErr(''); setMsg('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter the email address you signed up with.');
    setBusy(true);
    try {
      const r = await fetch(API_URL + '/v1/password-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Interface': STORE },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) throw new Error('Too many tries. Please wait a few minutes.');
      if (!r.ok) throw new Error((j.error && j.error.message) || 'Could not send the request.');
      setMsg(j.message || 'Thank you. Our team will contact you.');
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  }

  if (!open) return <p style={{ textAlign: 'center' }}><button type="button" className="chip" onClick={() => setOpen(true)}>Ask the team to reset my password</button></p>;
  return (
    <div style={{ textAlign: 'center' }}>
      <p className="muted">Enter your email and our team will send you a temporary password.</p>
      <input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} placeholder="Your email" aria-label="Your email" />
      {err ? <p className="err" role="alert">{err}</p> : null}
      {msg ? <p role="status">{msg}</p> : null}
      <p><button type="button" className="btn line" disabled={busy} onClick={send}>{busy ? 'Sending...' : 'Send request'}</button></p>
    </div>
  );
}
