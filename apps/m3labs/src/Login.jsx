import { useState } from 'react';
import { Footer, PasswordField } from '@pyfon/ui';
import { useAuth } from './Auth.jsx';
import { STAGE, STAGE_LABEL, FIXED, switchPortal } from './api.js';
import ChangePassword from './ChangePassword.jsx';
import { ls } from './store.js';
import LoginArt from './LoginArt.jsx';

const QUOTES = [
  'Good work is a promise kept to someone you may never meet.',
  'Small details, done well, are what customers remember.',
  'A calm desk and a clear list make a fast day.',
  "Every order is somebody's big moment. Treat it that way.",
  'Quality is what you do when nobody is checking.',
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [change, setChange] = useState(false);
  const img = ls.get('m3-inspire', null);
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try { await login(email.trim(), pw); } catch (x) { setErr(x.message || 'Could not sign in'); }
    setBusy(false);
  }
  return (
    <div className="split">
      <div className="split-form">
        <div className="inner">
          {!FIXED ? <button type="button" className="linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => switchPortal(null)}>&larr; Choose another desk</button> : null}
          <div className="wordmark" style={{ fontSize: '28px' }}>M3 <b>Labs</b></div>
          <p style={{ margin: 0 }}><span className="badge">{STAGE_LABEL[STAGE]}</span></p>
          <form className="card" onSubmit={submit}>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
            <PasswordField label="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
            {err ? <p className="err">{err}</p> : null}
            <button type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
            <button type="button" onClick={() => setChange(!change)} style={{ background: 'none', color: '#0b2a4a', textDecoration: 'underline', padding: 0 }}>Change password</button>
          </form>
          {change ? <ChangePassword signedIn={false} /> : null}
        </div>
        <Footer />
      </div>
      <LoginArt quote={quote} fallbackImg={img} />
    </div>
  );
}
