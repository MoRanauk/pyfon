import { useEffect, useState } from 'react';
import { PasswordField } from './PasswordField.jsx';
import { TextField } from './Forms.jsx';
import { Footer } from './Footer.jsx';

// Shown when someone signs in with a temporary password.
// It signs in again by itself to get a fresh token, then saves the new password.
function hasToken() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      if (String(localStorage.key(i)).indexOf('token') !== -1) return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}
function clearTokens() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = String(localStorage.key(i));
      if (k.indexOf('token') !== -1) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* ignore */ }
}
const link = { background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' };
const shell = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box', background: 'var(--pf-bg, #fff)', color: 'var(--pf-text, #111)' };

export function MustChangeGate({ client, children }) {
  const [must, setMust] = useState(false);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState('');
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => setMust(true);
    window.addEventListener('pyfon:must-change', on);
    if (hasToken()) {
      client.get('/v1/auth/me')
        .then((d) => {
          const u = d && (d.user || d);
          if (u && u.email) setEmail((p) => p || u.email);
          if (u && u.mustChangePassword) setMust(true);
        })
        .catch(() => {});
    }
    return () => window.removeEventListener('pyfon:must-change', on);
  }, [client]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!email.trim()) return setErr('Type your account email.');
    if (n1.length < 10) return setErr('The new password needs at least 10 characters.');
    if (n1 !== n2) return setErr('The two new passwords do not match.');
    if (n1 === cur) return setErr('Choose a password different from the temporary one.');
    setBusy(true);
    try {
      const d = await client.post('/v1/auth/login', { email: email.trim(), password: cur });
      await client.request('POST', '/v1/auth/change-password', { body: { current_password: cur, new_password: n1 }, token: d.token });
      clearTokens();
      setDone(true);
    } catch (x) {
      setErr(x.message || 'Could not change the password');
    }
    setBusy(false);
  }
  function out() { clearTokens(); window.location.reload(); }

  if (!must) return children;
  if (done) {
    return (
      <div style={shell}>
        <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px' }}>Password changed</h1>
          <p>Sign in with your new password.</p>
          <button className="btn" type="button" onClick={() => window.location.reload()} style={{ width: '100%' }}>Continue</button>
        </div>
        <div style={{ marginTop: '24px' }}><Footer /></div>
      </div>
    );
  }
  return (
    <div style={shell}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: '420px' }}>
        <h1 style={{ textAlign: 'center', fontSize: '24px' }}>Choose a new password</h1>
        <p style={{ textAlign: 'center' }}>You signed in with a temporary password. Choose your own to continue.</p>
        <TextField label="Your account email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <PasswordField label="Temporary password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <PasswordField label="New password (10+ characters)" value={n1} onChange={(e) => setN1(e.target.value)} autoComplete="new-password" />
        <PasswordField label="Type the new password again" value={n2} onChange={(e) => setN2(e.target.value)} autoComplete="new-password" />
        {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
        <button className="btn" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait...' : 'Save new password'}</button>
        <p style={{ textAlign: 'center', marginTop: '14px' }}>
          <button type="button" onClick={out} style={link}>Sign out instead</button>
        </p>
      </form>
      <div style={{ marginTop: '24px' }}><Footer /></div>
    </div>
  );
}
