import { useCallback, useEffect, useState } from 'react';
import { get } from './http.js';
import { STAGE } from './api.js';

const TYPES = [['', 'Everything'], ['signoffs', 'Job sign-offs and co-signs'], ['approvals', 'Approvals'], ['invoices', 'Invoices'], ['products', 'Products and videos'], ['orders', 'Orders, quotes and tickets'], ['logins', 'Sign-ins and passwords'], ['system', 'Settings and accounts']];
const DESK = { 'm3-creative': 'Creative desk', 'm3-production': 'Production desk', 'm3-finance': 'Finance desk', dev: 'Developer desk', mco: 'M & Co. shop', prestige: 'Prestige M shop', trim: 'TriM Atelier shop', vendor: 'Dealer portal' };
const PAGE = 50;
const day = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const start = () => ({ from: day(Date.now() - 7 * 864e5), to: day(Date.now()), actor: '', type: '', who: 'staff', q: '' });

function qs(a, limit, offset) {
  const p = new URLSearchParams();
  Object.entries(a).forEach(([k, v]) => { if (v) p.set(k, v); });
  p.set('limit', String(limit)); p.set('offset', String(offset));
  return (STAGE === 'dev' ? '/v1/dev' : '/v1/partner') + '/activity?' + p.toString();
}

export default function Activity() {
  const [f, setF] = useState(start());
  const [a, setA] = useState(start());
  const [page, setPage] = useState(0);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try { setD(await get(qs(a, PAGE, page * PAGE))); } catch (e) { setErr(e.message); }
  }, [a, page]);
  useEffect(() => { load(); }, [load]);

  async function download() {
    setErr('');
    try {
      const x = await get(qs(a, 2000, 0));
      const esc = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
      const lines = [['When', 'Desk', 'Who', 'What'].map(esc).join(',')].concat(
        x.rows.map((r) => [new Date(r.at).toLocaleString('en-KE'), DESK[r.desk] || r.desk || '', r.who || '', r.text].map(esc).join(','))
      );
      const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url; el.download = 'pyfon-activity-' + a.from + '-to-' + a.to + '.csv';
      el.click(); URL.revokeObjectURL(url);
    } catch (e) { setErr(e.message); }
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = d ? d.total : 0;
  return (
    <div>
      <h1 className="center">Activity log</h1>
      <p className="center muted">Everything the partners did, newest first.</p>
      <section className="card">
        <div className="actbar">
          <label>From <input type="date" value={f.from} onChange={set('from')} /></label>
          <label>To <input type="date" value={f.to} onChange={set('to')} /></label>
          <select value={f.actor} onChange={set('actor')}>
            <option value="">All partners</option>
            {d ? d.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>) : null}
          </select>
          <select value={f.type} onChange={set('type')}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={f.who} onChange={set('who')}>
            <option value="staff">Partners and developer only</option>
            <option value="all">Everyone, including customers</option>
          </select>
          <input placeholder="Search (name, job, invoice...)" value={f.q} onChange={set('q')} />
          <button type="button" onClick={() => { setPage(0); setA(f); }}>Show</button>
          <button type="button" className="linkbtn" onClick={() => { setF(start()); setA(start()); setPage(0); }}>Reset</button>
          <button type="button" onClick={download}>Download CSV</button>
        </div>
      </section>
      {err ? <p className="err center">{err}</p> : null}
      {d && d.rows.length === 0 ? <p className="center muted">Nothing found. Try wider dates or "Everyone".</p> : null}
      {d ? d.rows.map((r) => (
        <div className="actrow" key={r.id}>
          <span className="actwhen">{new Date(r.at).toLocaleString('en-KE')}<br /><span className="muted">{DESK[r.desk] || r.desk || ''}</span></span>
          <span>{r.text}</span>
        </div>
      )) : <p className="center">Loading...</p>}
      {d ? (
        <p className="center">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>{' '}
          <span className="muted">{total === 0 ? '0' : page * PAGE + 1 + ' to ' + Math.min(total, (page + 1) * PAGE)} of {total}</span>{' '}
          <button type="button" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next</button>
        </p>
      ) : null}
    </div>
  );
}
