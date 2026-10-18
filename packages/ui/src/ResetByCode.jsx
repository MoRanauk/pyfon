import { useEffect, useState } from 'react';
import { PasswordField } from './PasswordField.jsx';
import { TextField } from './Forms.jsx';

// The password reset window used by the shop and the partner portals.
// Pick a way (email, SMS, WhatsApp), get a 6-digit code, set a new password.
// Contact details are only ever shown masked. "Send again" unlocks after a 2-minute countdown.
const LABEL = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };
const link = { background: 'none', border: 0, padding: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' };
const fmtWait = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function hide(email) {
  const [local = '', domain = ''] = String(email).toLowerCase().split('@');
  const keep = (s) => (s.length <= 4 ? s.slice(0, 1) + '***' : s.slice(0, 2) + '***' + s.slice(-2));
  const dot = domain.lastIndexOf('.');
  return keep(local) + '@' + (dot > 0 ? domain.slice(0, 1) + '***' + domain.slice(dot) : domain.slice(0, 1) + '***');
}

export function ResetByCode({ client, fixedEmail, onDone }) {
  const [channels, setChannels] = useState(['email']);
  const [email, setEmail] = useState(fixedEmail || '');
  const [channel, setChannel] = useState('email');
  const [step, setStep] = useState('start');
  const [hint, setHint] = useState('');
  const [wait, setWait] = useState(0);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    client.get('/v1/auth/reset-channels')
      .then((d) => { if (d && Array.isArray(d.channels) && d.channels.length) setChannels(d.channels); })
      .catch(() => {});
  }, [client]);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(ch) {
    setErr('');
    if (!email.trim()) return setErr('Enter your account email.');
    setBusy(true);
    try {
      const d = await client.post('/v1/auth/forgot-password', { email: email.trim(), channel: ch });
      setChannel(ch);
      setHint(d.sentTo || '');
      setWait(d.retryAfter || 120);
      setStep('code');
    } catch (x) {
      setErr(x.message || 'Could not send the code');
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e) {
    e.preventDefault();
    setErr('');
    if (!/^\d{6}$/.test(code.trim())) return setErr('Type the 6-digit code.');
    if (pw.length < 10) return setErr('The new password needs at least 10 characters.');
    if (pw !== pw2) return setErr('The two new passwords do not match.');
    setBusy(true);
    try {
      await client.post('/v1/auth/reset-password', { email: email.trim(), code: code.trim(), new_password: pw });
      setCode(''); setPw(''); setPw2('');
      if (onDone) onDone();
    } catch (x) {
      setErr(x.message || 'Could not change the password');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'start') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); send(channel); }}>
        {fixedEmail ? (
          <p>The code goes to your account <strong>{hide(fixedEmail)}</strong>.</p>
        ) : (
          <TextField label="Your account email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        )}
        <p style={{ margin: '0 0 6px' }}>How should we send your code?</p>
        {channels.map((c) => (
          <label key={c} style={{ display: 'block', margin: '6px 0', cursor: 'pointer' }}>
            <input type="radio" name="how" checked={channel === c} onChange={() => setChannel(c)} style={{ width: 'auto', padding: 0, marginRight: '8px' }} />
            {LABEL[c]}
          </label>
        ))}
        {channel !== 'email' ? <p style={{ fontSize: '13px', opacity: 0.8 }}>SMS and WhatsApp go to the phone number saved on your account.</p> : null}
        {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Send code'}</button>
      </form>
    );
  }

  return (
    <form onSubmit={confirm}>
      <p>
        If the details match an account, we sent a 6-digit code by {LABEL[channel]} to <strong>{hint || 'the number on file'}</strong>. It works for 15 minutes.
      </p>
      <TextField label="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" />
      <PasswordField label="New password (10+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      <PasswordField label="Type the new password again" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
      {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Change password'}</button>
      <p style={{ marginTop: '12px' }}>
        <button type="button" disabled={wait > 0 || busy} onClick={() => send(channel)} style={{ ...link, opacity: wait > 0 ? 0.5 : 1 }}>
          {wait > 0 ? 'Send again in ' + fmtWait(wait) : 'Send again'}
        </button>
        {' \u00b7 '}
        <button type="button" onClick={() => { setErr(''); setStep('start'); }} style={link}>Use a different way</button>
      </p>
    </form>
  );
}
