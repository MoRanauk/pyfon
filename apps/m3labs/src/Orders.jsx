import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { P, STEP_LABEL, STATUS_LABEL, kes, age, hoursSince } from './api.js';
import { get } from './http.js';

const COLS = ['finance_quote', 'creative', 'production', 'finance_delivery'];
const FILTERS = [['all', 'All'], ['first', 'Need first signature'], ['second', 'Need second partner'], ['late', 'Over 24 h']];

export default function Orders() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    let live = true;
    async function load() {
      try { const r = await get(P + '/inflow'); if (live) { setD(r); setErr(''); } } catch (e) { if (live) setErr(e.message); }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { live = false; clearInterval(t); };
  }, []);

  if (!d) return <p className="center">{err || 'Loading...'}</p>;
  const needle = q.trim().toLowerCase();
  const jobs = d.jobs.filter((j) => {
    const okF = f === 'all' || (f === 'first' && j.stepStatus === 'active') || (f === 'second' && j.stepStatus === 'awaiting_cosign') || (f === 'late' && hoursSince(j.createdAt) > 24);
    const hay = [j.ref, j.customer, j.orderRef, j.quoteRef].join(' ').toLowerCase();
    return okF && (!needle || hay.includes(needle));
  });

  return (
    <div>
      <h1 className="center">Orders flow</h1>
      <p className="center muted">Every open order and quote, by stage. Everyone can see this board.</p>
      {err ? <p className="err center">{err}</p> : null}
      <div className="card">
        <input placeholder="Search by job, order or customer" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {FILTERS.map(([k, label]) => <button type="button" key={k} className={'chip' + (f === k ? ' on' : '')} onClick={() => setF(k)}>{label}</button>)}
        </div>
      </div>
      <div className="kan">
        {COLS.map((c) => {
          const col = jobs.filter((j) => j.currentStep === c);
          return (
            <div className="kcol" key={c}>
              <h3><span>{STEP_LABEL[c]}</span><span>{col.length}</span></h3>
              {!col.length ? <p className="muted">Nothing here.</p> : null}
              {col.map((j) => (
                <Link key={j.ref} to={'/jobs/' + j.ref} className={'kcard' + (hoursSince(j.createdAt) > 24 ? ' late' : '')}>
                  <b>{j.ref}</b>
                  <span>{j.customer || 'Customer'}</span>
                  <span className="muted">{j.orderRef ? 'Order ' + j.orderRef + ' \u00b7 ' + kes(j.totalKes) : 'Quote ' + j.quoteRef}</span>
                  <span className="muted">{STATUS_LABEL[j.stepStatus] || j.stepStatus} &middot; {age(j.createdAt)}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
