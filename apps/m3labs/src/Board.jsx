import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, P, STAGE_LABEL, STEP_LABEL, STATUS_LABEL, kes, age, hoursSince } from './api.js';

export default function Board() {
  const [data, setData] = useState(null);
  const [reqs, setReqs] = useState([]);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [w, r] = await Promise.all([api.get(P + '/workspace'), api.get(P + '/cosign-requests')]);
      setData(w);
      setReqs(r.requests || []);
      setErr('');
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function decide(id, what) {
    try { await api.post(P + '/cosign-requests/' + id + '/' + what); } catch (e) { setErr(e.message); }
    load();
  }

  if (!data) return <p className="center">{err || 'Loading...'}</p>;
  const jobs = data.jobs || [];
  const first = jobs.filter((j) => j.stepStatus === 'active').length;
  const second = jobs.filter((j) => j.stepStatus === 'awaiting_cosign').length;
  const late = jobs.filter((j) => hoursSince(j.createdAt) > 24).length;

  return (
    <div>
      <h1 className="center">{STAGE_LABEL[data.workspace]} workspace</h1>
      {err ? <p className="err center">{err}</p> : null}
      <div className="counters">
        <div className="count"><b>{jobs.length}</b><span>In this stage</span></div>
        <div className="count"><b>{first}</b><span>Need first signature</span></div>
        <div className="count"><b>{second}</b><span>Need second partner</span></div>
        <div className={'count' + (late ? ' alert' : '')}><b>{late}</b><span>Waiting over 24 h</span></div>
      </div>

      {reqs.length ? (
        <section className="card">
          <h2>Waiting for your approval</h2>
          {reqs.map((r) => (
            <div className="row" key={r.id}>
              <span><Link to={'/jobs/' + r.jobRef}>{r.jobRef}</Link> &middot; {STEP_LABEL[r.step] || r.step} &middot; asked by {r.requestedBy}</span>
              <span>
                <button type="button" onClick={() => decide(r.id, 'approve')}>Approve</button>{' '}
                <button type="button" className="ghost" onClick={() => decide(r.id, 'decline')}>Decline</button>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="card">
        <h2>Work waiting here</h2>
        {!jobs.length ? <p className="muted">Nothing waiting. New orders appear here when they reach this stage.</p> : null}
        {jobs.map((j) => (
          <Link className={'job' + (hoursSince(j.createdAt) > 24 ? ' late' : '')} key={j.ref} to={'/jobs/' + j.ref}>
            <b>{j.ref}</b>
            <span>{j.orderRef ? 'Order ' + j.orderRef + ' \u00b7 ' + kes(j.totalKes) : 'Quote ' + j.quoteRef + (j.quoteKind ? ' (' + j.quoteKind + ')' : '')}</span>
            <span>{STEP_LABEL[j.currentStep]} &middot; {STATUS_LABEL[j.stepStatus] || j.stepStatus}{j.firstSigner ? ' (signed by ' + j.firstSigner + ')' : ''}</span>
            <span className="muted">Waiting {age(j.createdAt)}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
