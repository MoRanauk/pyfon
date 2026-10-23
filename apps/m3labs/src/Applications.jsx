import { useCallback, useEffect, useState } from 'react';
import { get, post } from './http.js';
import { STAGE } from './api.js';

const B = '/v1/partner/applications';
const ROLE = { dealer: 'Dealer or maker', designer: 'Designer', both: 'Dealer and designer' };
const STATUS = { new: 'New', contacted: 'Contacted', accepted: 'Accepted', declined: 'Declined' };
const FILTERS = [['all', 'All'], ['new', 'New'], ['contacted', 'Contacted'], ['accepted', 'Accepted'], ['declined', 'Declined']];
const day = (d) => (d ? new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const guessCode = (name) => 'DLR-' + (String(name).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'NEW');
const isUrl = (u) => /^https?:\/\//i.test(String(u || ''));

function AppCard({ a, onDone }) {
  const [mode, setMode] = useState('');
  const [code, setCode] = useState(guessCode(a.name));
  const [spec, setSpec] = useState('');
  const [text, setText] = useState('');
  const [sendDecline, setSendDecline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const canAccept = a.role !== 'designer' && Boolean(a.email) && !a.hasAccount;

  async function run(fn, ok) {
    setErr(''); setMsg(''); setBusy(true);
    try { await fn(); setMsg(ok); setMode(''); setText(''); onDone(); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  function accept() {
    if (code.trim().length < 2) return setErr('Enter a dealer code.');
    if (spec.trim().length < 2) return setErr('Enter what the dealer specialises in.');
    run(() => post(B + '/' + a.id + '/accept', { code: code.trim(), speciality: spec.trim(), note: text.trim() || undefined }),
      'Invitation emailed to ' + a.email + '. The link works for 7 days.');
  }
  function decline() {
    run(() => post(B + '/' + a.id + '/decline', { send: sendDecline && Boolean(a.email), message: text.trim() || undefined }), 'Application declined.');
  }
  function sendEmail() {
    if (text.trim().length < 5) return setErr('Write your message first.');
    run(() => post(B + '/' + a.id + '/message', { channel: 'email', message: text.trim() }), 'Email sent.');
  }
  function whatsapp() {
    if (text.trim().length < 5) return setErr('Write your message first.');
    const digits = String(a.phone).replace(/\D/g, '');
    window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(text.trim()), '_blank', 'noopener');
    run(() => post(B + '/' + a.id + '/message', { channel: 'whatsapp', message: text.trim() }), 'Marked as contacted. Finish the message in WhatsApp.');
  }

  return (
    <section className="card">
      <h3>{a.name} <span className="pill">{STATUS[a.status] || a.status}</span></h3>
      <p className="muted">{ROLE[a.role] || a.role} {'\u00b7'} applied {day(a.createdAt)} {'\u00b7'} from {a.shop}</p>
      <p>Phone: {a.phone}{a.email ? ' \u00b7 ' + a.email : ' \u00b7 no email given'}</p>
      {a.link ? <p>Work: {isUrl(a.link) ? <a href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a> : a.link}</p> : null}
      <p style={{ whiteSpace: 'pre-wrap' }}>{a.about}</p>
      {a.handledBy ? <p className="muted">Last handled by {a.handledBy} on {day(a.handledAt)}</p> : null}
      {a.hasAccount ? <p className="ok">This dealer has created an account.</p> : null}
      {!a.hasAccount && a.inviteUntil ? <p className="muted">An invitation link is open until {day(a.inviteUntil)}.</p> : null}
      {msg ? <p className="ok">{msg}</p> : null}
      {err ? <p className="err">{err}</p> : null}

      {mode === 'accept' ? (
        <div>
          <p className="muted">Choose the dealer code the production partner will see when assigning jobs.</p>
          <input placeholder="Dealer code, for example DLR-KILIMO" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} />
          <input placeholder="Speciality, for example Embroidery and apparel" value={spec} onChange={(e) => setSpec(e.target.value)} maxLength={100} />
          <textarea rows={3} placeholder="Optional welcome line added to the email" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          <button type="button" disabled={busy} onClick={accept}>{busy ? 'Sending...' : 'Send invitation'}</button>
          <button type="button" className="danger" disabled={busy} onClick={() => setMode('')}>Cancel</button>
        </div>
      ) : null}
      {mode === 'decline' ? (
        <div>
          <textarea rows={3} placeholder="Optional extra line for the email" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          {a.email ? <label><input type="checkbox" checked={sendDecline} onChange={(e) => setSendDecline(e.target.checked)} /> Send them a polite email</label> : null}
          <button type="button" className="danger" disabled={busy} onClick={decline}>Decline application</button>
          <button type="button" disabled={busy} onClick={() => setMode('')}>Cancel</button>
        </div>
      ) : null}
      {mode === 'message' ? (
        <div>
          <textarea rows={4} placeholder="Write your message" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} />
          <button type="button" disabled={busy || !a.email} onClick={sendEmail}>Send email</button>
          <button type="button" disabled={busy} onClick={whatsapp}>Open WhatsApp</button>
          <button type="button" className="danger" disabled={busy} onClick={() => setMode('')}>Cancel</button>
          {!a.email ? <p className="muted">No email was given, so use WhatsApp.</p> : null}
        </div>
      ) : null}
      {!mode ? (
        <div>
          <button type="button" disabled={busy || !canAccept} onClick={() => { setErr(''); setMode('accept'); }}>Accept</button>
          <button type="button" disabled={busy} onClick={() => { setErr(''); setMode('message'); }}>Send message</button>
          {!a.hasAccount && a.status !== 'declined' ? <button type="button" className="danger" disabled={busy} onClick={() => { setErr(''); setMode('decline'); }}>Decline</button> : null}
          {a.role === 'designer' ? <p className="muted">Designers get a message only for now. There is no designer portal yet.</p> : null}
          {a.role !== 'designer' && !a.email && !a.hasAccount ? <p className="muted">Accept needs an email. Use Send message by WhatsApp.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default function Applications() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setList((await get(B)).applications); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (STAGE === 'dev') return <p className="center">Applications are handled on the partner desks.</p>;
  const shown = (list || []).filter((a) => filter === 'all' || a.status === filter);
  const fresh = (list || []).filter((a) => a.status === 'new').length;
  return (
    <div>
      <h1 className="center">Applications</h1>
      <p className="center muted">People who applied to sell with us. All three partners see this list. {fresh ? fresh + ' new.' : 'Nothing new.'}</p>
      {err ? <p className="err center">{err}</p> : null}
      <div className="row" style={{ justifyContent: 'center' }}>
        {FILTERS.map(([k, n]) => <button type="button" key={k} className={'sm' + (filter === k ? '' : ' danger')} onClick={() => setFilter(k)}>{n}</button>)}
      </div>
      {list === null && !err ? <p className="center muted">Loading...</p> : null}
      {list && !shown.length ? <p className="center muted">No applications here.</p> : null}
      {shown.map((a) => <AppCard key={a.id} a={a} onDone={load} />)}
    </div>
  );
}
