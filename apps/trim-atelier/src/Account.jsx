import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PasswordField } from '@pyfon/ui';
import { useAuth } from './store.jsx';
import { errText, normPhone } from './lib.js';
import PasswordHelp from './PasswordHelp.jsx';

export default function Account() {
  const { user, login, register, logout } = useAuth();
  const go = useNavigate();
  const [sp] = useSearchParams();
  const [mode, setMode] = useState(sp.get('mode') === 'up' ? 'up' : 'in');
  const [f, setF] = useState({ name: '', phone: '', email: '', pw: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'up') {
        const p = normPhone(f.phone);
        if (!p) throw new Error('Enter a valid phone number, like 0712345678.');
        await register(f.email.trim(), f.pw, f.name.trim(), p);
      } else await login(f.email.trim(), f.pw);
      go(sp.get('next') || '/');
    } catch (ex) { setErr(errText(ex)); }
    setBusy(false);
  }
  if (user) return <div className="wrap sec center"><h1>Hello, {user.fullName || user.full_name || user.email}</h1><button type="button" className="btn line" onClick={logout}>Sign out</button></div>;
  return (
    <div className="wrap sec"><form className="form" style={{ margin: '0 auto' }} onSubmit={submit}>
      <h1 className="center">{mode === 'up' ? 'Create your account' : 'Sign in'}</h1>
      {mode === 'up' ? <label className="fld"><span>Full name</span><input className="in" value={f.name} onChange={up('name')} /></label> : null}
      {mode === 'up' ? <label className="fld"><span>Phone</span><input className="in" value={f.phone} onChange={up('phone')} placeholder="0712345678" /></label> : null}
      <label className="fld"><span>Email</span><input className="in" type="email" value={f.email} onChange={up('email')} /></label>
      <PasswordField label="Password" value={f.pw} onChange={up('pw')} />
      {mode === 'up' ? <p className="muted">Use at least 10 characters.</p> : null}
      {err ? <p className="err" role="alert">{err}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'up' ? 'Sign up' : 'Sign in'}</button>
      <p><button type="button" className="chip" onClick={() => setMode(mode === 'up' ? 'in' : 'up')}>{mode === 'up' ? 'I already have an account' : 'Create an account'}</button></p>
      {mode === 'in' ? <PasswordHelp /> : null}
    </form></div>
  );
}
