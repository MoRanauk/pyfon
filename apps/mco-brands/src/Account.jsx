import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TextField } from '@pyfon/ui';
import { useAuth, displayName } from './AuthState.jsx';
import { errText } from './util.js';

export default function Account() {
  const { user, login, register, logout } = useAuth();
  const [mode, setMode] = useState('in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (mode === 'up' && fullName.trim().length < 2) return setErr('Enter your name.');
    if (mode === 'up' && password.length < 10) return setErr('Password must be at least 10 characters.');
    setBusy(true);
    try {
      if (mode === 'up') await register(email.trim(), password, fullName.trim());
      else await login(email.trim(), password);
      nav(next.startsWith('/') ? next : '/');
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="wrap section">
        <h2>Your account</h2>
        <p>Signed in as <strong>{displayName(user)}</strong>.</p>
        <button type="button" className="btn" onClick={logout}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="wrap section">
      <h2>{mode === 'up' ? 'Create your account' : 'Sign in'}</h2>
      <form onSubmit={submit} className="formcol">
        {mode === 'up' ? <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} /> : null}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'up' ? 'Sign up' : 'Sign in'}</button>
      </form>
      <p>
        <button type="button" className="linkbtn" onClick={() => { setErr(''); setMode(mode === 'up' ? 'in' : 'up'); }}>
          {mode === 'up' ? 'I already have an account' : 'Create a new account'}
        </button>
      </p>
    </div>
  );
}
