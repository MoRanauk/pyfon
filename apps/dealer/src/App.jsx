import { useEffect, useState } from 'react';
import { Footer, PasswordField, TextField, ResetByCode, MustChangeGate } from '@pyfon/ui';
import { api, tokens } from './api.js';
import Join from './Join.jsx';

const NEXT = { offered: 'accepted', accepted: 'in_progress', in_progress: 'ready' };
const LABEL = { offered: 'New offer', accepted: 'Accepted', in_progress: 'In progress', ready: 'Ready' };
const BUTTON = { accepted: 'Accept this job', in_progress: 'Start work', ready: 'Mark as ready' };

function show(v) {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.map(show).join(', ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => k + ': ' + show(x)).join(', ');
  return String(v);
}
const safeUrl = (u) => (/^https:\/\//i.test(String(u || '')) ? u : null);

function SignIn({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setNote('');
    setBusy(true);
    try {
      const d = await api.auth.login(email.trim(), pw);
      if (!d.user || d.user.role !== 'vendor') throw new Error('This portal is for dealers only.');
      tokens.set(d.token);
      onSignedIn(d.user);
    } catch (x) {
      setErr(x.message || 'Could not sign in');
    }
    setBusy(false);
  }

  if (forgot) {
    return (
      <div className="dp-card">
        <h3>Reset your password</h3>
        <ResetByCode client={api} onDone={() => { setForgot(false); setNote('Password changed. Sign in with your new password.'); }} />
        <p className="dp-center"><button type="button" className="dp-link" onClick={() => setForgot(false)}>Back to sign in</button></p>
      </div>
    );
  }
  return (
    <form className="dp-card" onSubmit={submit}>
      <h3>Sign in</h3>
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <PasswordField label="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
      {note ? <p role="status">{note}</p> : null}
      {err ? <p role="alert" className="dp-err">{err}</p> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      <p className="dp-center"><button type="button" className="dp-link" onClick={() => setForgot(true)}>Forgot my password</button></p>
    </form>
  );
}

function JobCard({ job, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const next = NEXT[job.dealerStatus];
  const canMove = Boolean(next) && job.jobStatus === 'open' && job.step === 'production';

  async function move() {
    setBusy(true);
    setErr('');
    try {
      await api.post('/v1/vendor/jobs/' + job.ref + '/status', { status: next });
      await onChange();
    } catch (x) {
      setErr(x.message || 'Could not update this job');
    }
    setBusy(false);
  }

  return (
    <div className="dp-card">
      <div className="dp-row">
        <h3>{job.ref}</h3>
        <span className={'dp-chip' + (job.dealerStatus === 'ready' ? ' ready' : '')}>{LABEL[job.dealerStatus] || job.dealerStatus}</span>
      </div>
      <p className="dp-muted">Received {new Date(job.createdAt).toLocaleDateString('en-KE')}</p>
      {job.kind === 'order' ? (
        <ul className="dp-list">
          {(job.items || []).map((it, i) => (
            <li key={i}>
              <b>{it.name}</b> x {it.qty}
              {show(it.options) ? <div className="dp-muted">Options: {show(it.options)}</div> : null}
              {show(it.personalization) ? <div className="dp-muted">Personalisation: {show(it.personalization)}</div> : null}
              {it.design ? <div className="dp-muted">Design: {it.design.name}{safeUrl(it.design.url) ? <span> (<a href={it.design.url} target="_blank" rel="noopener noreferrer">open</a>)</span> : null}</div> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <p><b>{job.item || 'Print job'}</b>{job.quantity ? ' x ' + job.quantity : ''}</p>
          {show(job.spec) ? <p className="dp-muted">{show(job.spec)}</p> : null}
        </div>
      )}
      {(job.files || []).length ? (
        <div>
          <b>Files</b>
          <ul className="dp-list">
            {job.files.map((f, i) => (
              <li key={i}>{safeUrl(f.url) ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.original_name || f.purpose || 'file'}</a> : (f.original_name || 'file')}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {canMove ? <button className="btn" type="button" disabled={busy} onClick={move}>{busy ? 'Please wait...' : BUTTON[next]}</button> : null}
      {!canMove && next ? <p className="dp-muted">Waiting. You can update this job once it is in production.</p> : null}
      {job.dealerStatus === 'ready' ? <p className="dp-muted">Marked ready. The Pyfon team takes it from here.</p> : null}
      {err ? <p role="alert" className="dp-err">{err}</p> : null}
    </div>
  );
}

function Portal({ user, onOut }) {
  const [jobs, setJobs] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const d = await api.get('/v1/vendor/jobs');
      setJobs(d.jobs || []);
      setErr('');
    } catch (x) {
      setErr(x.message || 'Could not load your jobs');
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div className="dp-row" style={{ marginBottom: '12px' }}>
        <span>{user.fullName || user.email}</span>
        <span>
          <button type="button" className="dp-link" onClick={load}>Refresh</button>
          {' \u00b7 '}
          <button type="button" className="dp-link" onClick={onOut}>Sign out</button>
        </span>
      </div>
      {err ? <p role="alert" className="dp-err">{err}</p> : null}
      {jobs === null && !err ? <p className="dp-center">Loading...</p> : null}
      {jobs && !jobs.length ? <div className="dp-card dp-center">No jobs yet. New work from Pyfon Brands appears here.</div> : null}
      {(jobs || []).map((j) => <JobCard key={j.ref} job={j} onChange={load} />)}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokens.get()) { setReady(true); return; }
    api.auth.me()
      .then((d) => { const u = d.user || d; if (u && u.role === 'vendor') setUser(u); else tokens.clear(); })
      .catch(() => tokens.clear())
      .finally(() => setReady(true));
  }, []);

  function out() { tokens.clear(); setUser(null); }
  if (window.location.pathname === '/join') return <Join />;

  return (
    <MustChangeGate client={api}>
      <div className="dp-wrap">
        <div className="dp-main">
          <div className="dp-brand">Pyfon Dealer Portal</div>
          <p className="dp-sub">Jobs from Pyfon Brands, in one place.</p>
          {!ready ? <p className="dp-center">Loading...</p> : user ? <Portal user={user} onOut={out} /> : <SignIn onSignedIn={setUser} />}
        </div>
        <Footer />
      </div>
    </MustChangeGate>
  );
}
