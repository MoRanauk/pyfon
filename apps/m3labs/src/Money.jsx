import { useEffect, useState } from 'react';
import { STAGE, kes } from './api.js';
import { call, CATS, today, monthStart, downloadCsv } from './moneyApi.js';
import { MONEY_CSS, Ledger, CategoryTable, JobTable } from './MoneyTables.jsx';

const ago = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
const blank = { kind: 'income', date: today(), category: 'Sales', costType: 'direct', amount: '', job: '', party: '', note: '' };

export default function Money() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [sum, setSum] = useState(null);
  const [entries, setEntries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showDel, setShowDel] = useState(false);
  const [f, setF] = useState(blank);
  const [tab, setTab] = useState('ledger');
  const [form, setForm] = useState(false);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  async function load() {
    try {
      const qs = '?from=' + from + '&to=' + to;
      const [s, e, j] = await Promise.all([call('GET', '/money/summary' + qs), call('GET', '/money/entries' + qs + (showDel ? '&deleted=1' : '')), call('GET', '/money/by-job' + qs)]);
      setSum(s); setEntries(e.entries); setJobs(j.jobs);
    } catch (x) { setErr(x.message); }
  }
  useEffect(() => { load(); }, [from, to, showDel]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function run(fn, ok) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); load(); } catch (x) { setErr(x.message); }
  }
  const save = () => run(async () => {
    await call('POST', '/money/entries', { date: f.date, kind: f.kind, category: f.category, costType: f.kind === 'expense' ? f.costType : undefined, amountKes: Number(f.amount), jobRef: f.job || undefined, party: f.party || undefined, note: f.note || undefined });
    setF({ ...f, amount: '', job: '', party: '', note: '' });
  }, 'Saved.');
  function reverse(id) {
    const reason = window.prompt('Why are you reversing this entry?');
    if (reason) run(() => call('POST', '/money/entries/' + id + '/reverse', { reason }), 'Reversal added.');
  }
  function del(id) {
    const reason = window.prompt('Why should this entry be deleted?');
    if (reason) run(() => call('POST', '/approvals', { action: 'money_delete', payload: { entryId: id, reason } }), 'Delete request sent. All three partners must approve it under Approvals.');
  }
  if (STAGE === 'dev') return <p className="center">The Money book is on the partner desks.</p>;
  const ranges = [['This month', monthStart(), today()], ['Last 30 days', ago(30), today()], ['This year', today().slice(0, 4) + '-01-01', today()]];
  const tiles = sum ? [['Income', sum.income], ['Direct costs', sum.direct], ['Gross profit', sum.gross], ['Overheads', sum.overhead], ['Net profit', sum.net]] : [];
  return (
    <div className="mb">
      <style>{MONEY_CSS}</style>
      <h1>Money book</h1>
      <div className="mbar">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        {ranges.map((r) => <button key={r[0]} type="button" className={'chip' + (from === r[1] && to === r[2] ? ' on' : '')} onClick={() => { setFrom(r[1]); setTo(r[2]); }}>{r[0]}</button>)}
      <input placeholder="Search entries" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label><input type="checkbox" checked={showDel} onChange={(e) => setShowDel(e.target.checked)} /> show deleted</label>
        <button type="button" className="chip" onClick={() => downloadCsv(entries)}>Download CSV</button>
        <button type="button" className={'chip' + (form ? ' on' : '')} onClick={() => setForm(!form)}>{form ? 'Close form' : '+ New entry'}</button>
      </div>
      {err ? <p style={{ color: '#a02020', textAlign: 'center' }}>{err}</p> : null}
      {msg ? <p style={{ color: '#1b7a3a', textAlign: 'center' }}>{msg}</p> : null}
      <div className="sum">
        {tiles.map(([l, v]) => <div key={l}><small>{l}</small><b className={l === 'Net profit' ? (v < 0 ? 'out' : 'in') : ''}>{kes(v)}</b></div>)}
      </div>
      {form ? (
        <div className="form">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, category: CATS[e.target.value][0] })}><option value="income">Income</option><option value="expense">Expense</option></select>
          <input type="date" value={f.date} onChange={set('date')} />
          <select value={f.category} onChange={set('category')}>{CATS[f.kind].map((c) => <option key={c}>{c}</option>)}</select>
          {f.kind === 'expense' ? <select value={f.costType} onChange={set('costType')}><option value="direct">Direct cost</option><option value="overhead">Overhead</option></select> : null}
          <input type="number" min="1" placeholder="Amount KES" value={f.amount} onChange={set('amount')} />
          <input placeholder="Job reference (optional)" value={f.job} onChange={set('job')} />
          <input placeholder="Customer, dealer or supplier" value={f.party} onChange={set('party')} />
          <input className="wide" placeholder="Note" value={f.note} onChange={set('note')} />
          <button type="button" className="chip on" onClick={save}>Save entry</button>
          <p className="hint">Direct costs belong to a job (materials, dealer payments). Overheads are running costs (rent, salaries). Entries cannot be edited: use the reverse icon on a wrong one.</p>
        </div>
      ) : null}
      <div className="mbar">
        {[['ledger', 'Ledger'], ['category', 'By category'], ['job', 'By job']].map(([k, l]) => <button key={k} type="button" className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'ledger' ? <Ledger entries={entries} query={search} onReverse={reverse} onDelete={del} /> : null}
      {tab === 'category' ? <CategoryTable rows={sum ? sum.byCategory : []} /> : null}
      {tab === 'job' ? <JobTable jobs={jobs} /> : null}
    </div>
  );
}
