import { useEffect, useState } from 'react';
import { STAGE, kes } from './api.js';
import { call, CATS, today, monthStart, downloadCsv } from './moneyApi.js';
import { EntryTable, JobTable } from './MoneyTables.jsx';

const card = { background: '#fff', border: '1px solid #e3e3e3', borderRadius: '12px', padding: '14px', margin: '12px auto', maxWidth: '1000px', textAlign: 'left' };
const inp = { padding: '8px', border: '1px solid #bbb', borderRadius: '8px', margin: '4px', minWidth: 0 };
const btn = { padding: '8px 14px', border: 'none', borderRadius: '16px', background: '#0b2a4a', color: '#fff', cursor: 'pointer', margin: '4px' };
const blank = { kind: 'income', date: today(), category: 'Sales', costType: 'direct', amount: '', job: '', party: '', note: '' };

export default function Money() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [sum, setSum] = useState(null);
  const [entries, setEntries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showDel, setShowDel] = useState(false);
  const [f, setF] = useState(blank);
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
  const tiles = sum ? [['Income', sum.income], ['Direct costs', sum.direct], ['Gross profit', sum.gross], ['Overheads', sum.overhead], ['Net profit', sum.net]] : [];
  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Money book</h1>
      <div style={card}>
        <b>Dates</b> <input type="date" style={inp} value={from} onChange={(e) => setFrom(e.target.value)} /> to <input type="date" style={inp} value={to} onChange={(e) => setTo(e.target.value)} />
        <label style={{ marginLeft: '10px' }}><input type="checkbox" checked={showDel} onChange={(e) => setShowDel(e.target.checked)} /> show deleted</label>
      </div>
      {err ? <p style={{ color: '#a02020' }}>{err}</p> : null}
      {msg ? <p style={{ color: '#1b7a3a' }}>{msg}</p> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {tiles.map((t) => <div key={t[0]} style={{ ...card, margin: '6px', minWidth: '150px', maxWidth: 'none', textAlign: 'center' }}><small>{t[0]}</small><br /><b style={{ fontSize: '20px' }}>{kes(t[1])}</b></div>)}
      </div>
      <div style={card}>
        <b>Add an entry</b>
        <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Direct costs belong to a job (materials, dealer payments). Overheads are running costs (rent, salaries). Entries cannot be edited: reverse a wrong one.</p>
        <select style={inp} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, category: CATS[e.target.value][0] })}><option value="income">Income</option><option value="expense">Expense</option></select>
        <input type="date" style={inp} value={f.date} onChange={set('date')} />
        <select style={inp} value={f.category} onChange={set('category')}>{CATS[f.kind].map((c) => <option key={c}>{c}</option>)}</select>
        {f.kind === 'expense' ? <select style={inp} value={f.costType} onChange={set('costType')}><option value="direct">Direct cost</option><option value="overhead">Overhead</option></select> : null}
        <input type="number" min="1" style={inp} placeholder="Amount KES" value={f.amount} onChange={set('amount')} />
        <input style={inp} placeholder="Job reference (optional)" value={f.job} onChange={set('job')} />
        <input style={inp} placeholder="Customer, dealer or supplier" value={f.party} onChange={set('party')} />
        <input style={{ ...inp, width: '90%' }} placeholder="Note" value={f.note} onChange={set('note')} />
        <button type="button" style={btn} onClick={save}>Save entry</button>
      </div>
      <div style={card}><b>Entries</b> <button type="button" style={btn} onClick={() => downloadCsv(entries)}>Download CSV</button><EntryTable entries={entries} onReverse={reverse} onDelete={del} /></div>
      <div style={card}><b>Profit per job</b><JobTable jobs={jobs} /></div>
    </div>
  );
}
