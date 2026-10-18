import { useState } from 'react';
import { Footer, PasswordField } from '@pyfon/ui';
import { useAuth } from './Auth.jsx';
import { STAGE, STAGE_LABEL } from './api.js';
import ChangePassword from './ChangePassword.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [change, setChange] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try { await login(email.trim(), pw); } catch (x) { setErr(x.message || 'Could not sign in'); }
    setBusy(false);
  }
  return (
    <div className="shell">
      <main className="page narrow">
        <h1 className="center">M3 Labs</h1>
        <p className="center"><span className="badge">{STAGE_LABEL[STAGE]}</span></p>
        <form className="card" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
          <PasswordField label="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
          {err ? <p className="err">{err}</p> : null}
          <button type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <button type="button" onClick={() => setChange(!change)} style={{ background: 'none', color: '#0b2a4a', textDecoration: 'underline', padding: 0 }}>Change password</button>
        </form>
        {change ? <ChangePassword signedIn={false} /> : null}
      </main>
      <Footer />
    </div>
  );
}
