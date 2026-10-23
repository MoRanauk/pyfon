import { useEffect, useState } from 'react';
import { Footer, PasswordField, TextField } from '@pyfon/ui';
import { api } from './api.js';

// Opened from the emailed invitation: /join?token=...
export default function Join() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [state, setState] = useState('checking');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try { window.history.replaceState(null, '', '/join'); } catch (e) { /* ignore */ }
    if (!token) { setState('bad'); return; }
    api.post('/v1/dealer-invite/check', { token })
      .then((d) => { setName(d.name || ''); setEmail(d.email || ''); setState('ready'); })
      .catch(() => setState('bad'));
  }, [token]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Enter your name or business name.');
    if (pw.length < 10) return setErr('The password needs at least 10 characters.');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true);
    try {
      await api.post('/v1/dealer-invite/accept', { token, full_name: name.trim(), password: pw });
      setState('done');
    } catch (x) {
      setErr(x.message || 'Could not create your account');
    }
    setBusy(false);
  }

  return (
    <div className="dp-wrap">
      <div className="dp-main">
        <div className="dp-brand">Pyfon Dealer Portal</div>
        {state === 'checking' ? <p className="dp-center">Checking your invitation...</p> : null}
        {state === 'bad' ? (
          <div className="dp-card dp-center">
            <h3>This link is not valid</h3>
            <p>It may have been used already or it has expired. Ask the Pyfon team to send you a new invitation.</p>
          </div>
        ) : null}
        {state === 'done' ? (
          <div className="dp-card dp-center">
            <h3>Your account is ready</h3>
            <p>Sign in with your email and the password you just chose.</p>
            <button className="btn" type="button" onClick={() => window.location.assign('/')}>Go to sign in</button>
          </div>
        ) : null}
        {state === 'ready' ? (
          <form className="dp-card" onSubmit={submit}>
            <h3>Create your dealer account</h3>
            <p className="dp-muted">Your sign-in email will be <b>{email}</b>.</p>
            <TextField label="Your name or business name" value={name} onChange={(e) => setName(e.target.value)} />
            <PasswordField label="Choose a password (10+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            <PasswordField label="Type the password again" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            {err ? <p role="alert" className="dp-err">{err}</p> : null}
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Create my account'}</button>
          </form>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}
