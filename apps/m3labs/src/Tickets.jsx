import { useCallback, useEffect, useState } from 'react';
import { P, STAGE } from './api.js';
import { get, post } from './http.js';

const DEV = STAGE === 'dev';
const B = (DEV ? '/v1/dev' : P) + '/tickets';
const LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
const when = (d) => new Date(d).toLocaleString('en-KE');
const blank = { subject: '', body: '', priority: 'normal', jobRef: '' };

export default function Tickets() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('active');
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState('');
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setList((await get(B + (DEV ? '?status=' + filter : ''))).tickets); } catch (e) { setErr(e.message); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function show(ref) {
    setErr(''); setMsg(''); setReply('');
    try { setThread(await get(B + '/' + ref)); } catch (e) { setErr(e.message); }
  }
  async function run(fn, ok, ref) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); if (ref) await show(ref); await load(); } catch (e) { setErr(e.message); }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const create = () => run(async () => {
    const b = { subject: f.subject, body: f.body, priority: f.priority };
    if (f.jobRef.trim()) b.jobRef = f.jobRef.trim();
    await post(B, b);
    setF(blank);
  }, 'Ticket sent. The answer will appear here.');
  const wrap = { maxWidth: '720px', margin: '0 auto' };
  const note = (<>{msg ? <p className="ok center">{msg}</p> : null}{err ? <p className="err center">{err}</p> : null}</>);

  if (thread) {
    const t = thread.ticket;
    return (
      <div style={wrap}>
        <h1 className="center">{t.subject}</h1>
        <p className="center"><button type="button" className="btnlink" onClick={() => { setThread(null); setMsg(''); setErr(''); }}>&larr; Back to tickets</button></p>
        {note}
        <section className="card">
          <p className="muted">{t.ref} &middot; {LABEL[t.status]} &middot; {t.priority} priority{t.jobRef ? ' \u00b7 job ' + t.jobRef : ''}</p>
          {t.openedBy ? <p className="muted">From {t.openedBy.name} ({t.openedBy.role}) on {t.interface}</p> : null}
          <p style={{ whiteSpace: 'pre-wrap' }}>{t.body}</p>
        </section>
        {thread.comments.map((c) => (
          <section className="card" key={c.id}>
            <p className="muted">{c.authorName} ({c.authorRole}) &middot; {when(c.createdAt)}</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
          </section>
        ))}
        <section className="card">
          <textarea rows="3" placeholder="Write a reply" value={reply} onChange={(e) => setReply(e.target.value)} />
          <button type="button" disabled={!reply.trim()} onClick={() => run(() => post(B + '/' + t.ref + '/comments', { body: reply.trim() }), 'Reply sent.', t.ref)}>Send reply</button>
          {DEV ? Object.keys(LABEL).map((s) => (
            <button key={s} type="button" className="line sm" disabled={t.status === s} onClick={() => run(() => post(B + '/' + t.ref + '/status', { status: s }), 'Marked ' + LABEL[s] + '.', t.ref)}>{LABEL[s]}</button>
          )) : null}
        </section>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <h1 className="center">Tickets</h1>
      <p className="center muted">{DEV ? 'Problems reported by partners, dealers and customers.' : 'Report a problem to the developer and follow the answer here.'}</p>
      {note}
      {!DEV ? (
        <section className="card">
          <h2>Report a problem</h2>
          <input placeholder="Short title" maxLength={150} value={f.subject} onChange={set('subject')} />
          <textarea rows="4" placeholder="What happened? What did you expect?" value={f.body} onChange={set('body')} />
          <select value={f.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High (urgent)</option>
          </select>
          <input placeholder="Job reference, if any (example JOB-000012)" value={f.jobRef} onChange={set('jobRef')} />
          <button type="button" onClick={create}>Send ticket</button>
        </section>
      ) : (
        <p className="center">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="active">Open and in progress</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </p>
      )}
      {!list ? <p className="center muted">Loading...</p> : null}
      {list && !list.length ? <p className="center muted">No tickets here.</p> : null}
      {list ? list.map((t) => (
        <section className="card" key={t.ref}>
          <div className="mrow">
            <span className="grow"><b>{t.subject}</b><br /><span className="muted">{t.ref} &middot; {LABEL[t.status]} &middot; {t.priority}{t.openedBy ? ' \u00b7 ' + t.openedBy.name : ''} &middot; {when(t.updatedAt)}</span></span>
            <button type="button" className="btnlink" onClick={() => show(t.ref)}>Open</button>
          </div>
        </section>
      )) : null}
    </div>
  );
}
