import { useState } from 'react';
import PhoneField, { phoneOk, phoneForServer, emailOk } from './PhoneField.jsx';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TextField, PasswordField, ResetByCode } from '@pyfon/ui';
import { api } from './api.js';
import { useAuth, displayName } from './AuthState.jsx';
import { errText } from './util.js';

export default function Account() {
  const { user, login, register, logout } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'up' ? 'up' : 'in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fails, setFails] = useState(0);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const next = params.get('next') || '/';

  function go(m) { setErr(''); setInfo(''); setMode(m); }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setInfo('');
    if (mode === 'up' && fullName.trim().length < 2) return setErr('Enter your name.');
    if (mode === 'up' && !phoneOk(phone)) return setErr('Choose your country and enter a valid phone number.');
    if (mode === 'up' && password.length < 10) return setErr('Password must be at least 10 characters.');
    setBusy(true);
    try {
      if (mode === 'up') await register(email.trim(), password, fullName.trim(), phone.trim());
      else await login(email.trim(), password);
      nav(next.startsWith('/') ? next : '/');
    } catch (ex) {
      if (mode === 'in') setFails((n) => n + 1);
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="auth">
        <h1>Your account</h1>
        <p>Signed in as <strong>{displayName(user)}</strong>.</p>
        <button type="button" className="btn" onClick={logout}>Sign out</button>
        <p><Link to="/orders">My orders and quotes</Link></p>
        <p><Link to="/cart">Go to my cart</Link></p>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="auth">
        <h1>Reset your password</h1>
        <p className="muted">We will send you a 6-digit code to confirm it is you.</p>
        <ResetByCode helpShop="mco" client={api} onDone={() => { setFails(0); setPassword(''); go('in'); setInfo('Password changed. Sign in with your new password.'); }} />
        <p><button type="button" className="linkbtn" onClick={() => go('in')}>Back to sign in</button></p>
      </div>
    );
  }

  return (
    <div className="auth">
      <h1>{mode === 'up' ? 'Join M & Co. Brands' : 'Welcome back'}</h1>
      <p className="muted">{mode === 'up' ? 'Create an account to order, request quotes and follow your jobs.' : 'Sign in to order and follow your jobs.'}</p>
      {mode === 'up' ? (
        <div className="who">
          <div className="whocard on"><strong>Customer signup</strong><span>Order products and request quotes</span></div>
          <Link className="whocard" to="/sell"><strong>Sell with us</strong><span>Designers and dealers, apply here</span></Link>
        </div>
      ) : null}
      <form onSubmit={submit}>
        {mode === 'up' ? <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} /> : null}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode === 'up' ? <PhoneField label="Phone (for order updates and password codes)" onChange={setPhone} /> : null}
        <PasswordField label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {info ? <p role="status" style={{ color: '#1b6e3c', margin: 0 }}>{info}</p> : null}
        {err ? <p role="alert" style={{ color: '#b00020', margin: 0 }}>{err}</p> : null}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'up' ? 'Sign up' : 'Sign in'}</button>
      </form>
      {mode === 'in' && fails >= 3 ? (
        <p><button type="button" className="linkbtn" onClick={() => go('reset')}>Forgot your password?</button></p>
      ) : null}
      <p>
        {mode === 'up' ? 'Already have an account? ' : 'New here? '}
        <button type="button" className="linkbtn" onClick={() => go(mode === 'up' ? 'in' : 'up')}>
          {mode === 'up' ? 'Log in' : 'Create an account'}
        </button>
      </p>
    </div>
  );
}
