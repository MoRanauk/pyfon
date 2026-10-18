import { useState } from 'react';
import { PasswordField, ResetByCode } from '@pyfon/ui';
import { api, tokens } from './api.js';
import { useAuth } from './Auth.jsx';

// Changes a partner's password. The main way is a code (email now; SMS or WhatsApp once phone numbers are saved).
// The fallback uses the current password. Remove the fallback once codes are working for all three partners.
export default function ChangePassword({ signedIn }) {
  const { user } = useAuth();
  const [mode, setMode] = useState('code');
  const [round, setRound] = useState(0);
  const [done, setDone] = useState('');
  const [email, setEmail] = useState('');
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setDone('');
    if (n1.length < 10) return setErr('The new password needs at least 10 characters.');
    if (n1 !== n2) return setErr('The two new passwords do not match.');
    setBusy(true);
    const had = tokens.get();
    try {
      if (!signedIn) {
        const d = await api.auth.login(email.trim(), cur);
        tokens.set(d.token);
      }
      await api.auth.changePassword(cur, n1);
      setDone(signedIn ? 'Password changed.' : 'Password changed. Now sign in above with the new password.');
      setCur(''); setN1(''); setN2('');
    } catch (x) {
      setErr(x.message || 'Could not change the password');
    } finally {
      if (!signedIn) { if (had) tokens.set(had); else tokens.clear(); }
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Change password</h2>
      {done ? <p className="ok">{done}</p> : null}
      {mode === 'code' ? (
        <ResetByCode
          key={round}
          client={api}
          fixedEmail={signedIn && user ? user.email : undefined}
          onDone={() => { setDone(signedIn ? 'Password changed.' : 'Password changed. Now sign in above with the new password.'); setRound(round + 1); }}
        />
      ) : (
        <form onSubmit={submit}>
          {!signedIn ? <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label> : null}
          <PasswordField label={signedIn ? 'Current password' : 'Current or temporary password'} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
          <PasswordField label="New password (10+ characters)" value={n1} onChange={(e) => setN1(e.target.value)} autoComplete="new-password" required />
          <PasswordField label="Type the new password again" value={n2} onChange={(e) => setN2(e.target.value)} autoComplete="new-password" required />
          {err ? <p className="err">{err}</p> : null}
          <button type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Change password'}</button>
        </form>
      )}
      <button type="button" onClick={() => { setErr(''); setMode(mode === 'code' ? 'old' : 'code'); }} style={{ background: 'none', color: '#0b2a4a', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
        {mode === 'code' ? 'Use my current password instead' : 'Use a code instead'}
      </button>
    </div>
  );
}
