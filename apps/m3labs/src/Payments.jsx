import { useEffect, useState } from 'react';
import { call } from './moneyApi.js';

const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const when = (d) => { try { return new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const STORES = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };
const TABS = [['awaiting', 'Waiting'], ['confirmed', 'Confirmed'], ['rejected', 'Rejected']];

function group(list) {
  const out = [];
  const idx = {};
  list.forEach((p) => {
    if (!p.batchId) { out.push({ key: 'p' + p.id, items: [p] }); return; }
    if (idx[p.batchId] == null) { idx[p.batchId] = out.length; out.push({ key: p.batchId, batchId: p.batchId, items: [p] }); } else { out[idx[p.batchId]].items.push(p); }
  });
  return out;
}

function PayCard({ p, onDone }) {
  const [code, setCode] = useState(p.claimedCode || '');
  const [amt, setAmt] = useState(String(p.claimedAmountKes || p.dueKes || ''));
  const [reason, setReason] = useState('');
  const [rej, setRej] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function confirm() {
    setBusy(true); setErr('');
    try {
      const r = await call('POST', '/payments/' + p.id + '/confirm', { mpesaCode: code.trim().toUpperCase(), amountKes: Number(amt) });
      onDone('Confirmed ' + p.orderRef + '. ' + (r.emailed ? 'Customer emailed. ' : 'No email sent. ') + (r.messageQueued ? 'Message queued.' : 'Message NOT queued.'));
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function reject() {
    setBusy(true); setErr('');
    try { await call('POST', '/payments/' + p.id + '/reject', { reason }); onDone('Rejected ' + p.orderRef + '.'); } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <strong>{p.orderRef}</strong> <span className="pill">{STORES[p.store] || p.store}</span> {p.jobRef ? '(' + p.jobRef + ')' : ''} - {p.customer} {p.phone}
      <div className="muted">Order {kes(p.totalKes)} | paid {kes(p.paidKes)} | due {kes(p.dueKes)} | sent {when(p.createdAt)}</div>
      {p.status === 'awaiting' ? (
        <div>
          <p className="muted">Find this payment in the till messages or statement (look for {p.customer} {p.phone} and the amount), type its M-Pesa code, then confirm.</p>
          <div className="row">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="M-Pesa code" maxLength={20} />
            <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Amount KES" inputMode="numeric" />
            <button type="button" className="btn" disabled={busy || code.trim().length < 4 || !amt} onClick={confirm}>Confirm payment</button>
            <button type="button" className="btn danger" disabled={busy} onClick={() => setRej(!rej)}>Reject</button>
          </div>
          {rej ? (
            <div className="row">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? (the customer is not told this)" maxLength={300} />
              <button type="button" className="btn danger" disabled={busy || reason.trim().length < 3} onClick={reject}>Reject now</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="muted">{p.status === 'confirmed' ? 'Confirmed ' + kes(p.amountKes) + ' | M-Pesa code ' + p.mpesaCode : 'Rejected: ' + (p.rejectReason || '')} | by {p.handledBy || '-'} {when(p.handledAt)}</div>
      )}
      {err ? <p className="err" role="alert">{err}</p> : null}
    </div>
  );
}

function GroupCard({ g, onDone }) {
  const first = g.items[0];
  const awaiting = first.status === 'awaiting';
  const total = g.items.reduce((a, x) => a + Number(x.amountKes || x.claimedAmountKes || 0), 0);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('');
  const [rej, setRej] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function confirm() {
    setBusy(true); setErr('');
    try {
      const r = await call('POST', '/payments/batch/' + g.batchId + '/confirm', { mpesaCode: code.trim().toUpperCase() });
      onDone('Confirmed ' + r.orders.length + ' orders (' + kes(r.totalKes) + '). ' + (r.emailed ? 'Customer emailed. ' : 'No email sent. ') + (r.messageQueued ? 'Message queued.' : 'Message NOT queued.'));
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  async function reject() {
    setBusy(true); setErr('');
    try { await call('POST', '/payments/batch/' + g.batchId + '/reject', { reason }); onDone('Rejected the group of ' + g.items.length + ' orders.'); } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}>
        <strong>{g.items.length} orders paid together</strong> <span className="pill">{STORES[first.store] || first.store}</span> - {first.customer} {first.phone}
        <div className="muted">
          Total {kes(total)} | sent {when(first.createdAt)}
          {first.status === 'confirmed' ? ' | M-Pesa code ' + first.mpesaCode : ''}
          {' | '}{open ? 'Hide orders' : 'Show orders'}
        </div>
      </button>
      {open ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Order</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Order total</th></tr></thead>
          <tbody>
            {g.items.map((x) => (
              <tr key={x.id}>
                <td style={{ padding: '4px 0' }}>{x.orderRef}{x.jobRef ? ' (' + x.jobRef + ')' : ''}</td>
                <td style={{ textAlign: 'right' }}>{kes(x.amountKes || x.claimedAmountKes)}</td>
                <td style={{ textAlign: 'right' }}>{kes(x.totalKes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {awaiting ? (
        <div>
          <p className="muted">One M-Pesa payment of {kes(total)}. Find it in the till messages (look for {first.customer} {first.phone}), type its code once, then confirm all {g.items.length} orders.</p>
          <div className="row">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="M-Pesa code" maxLength={20} />
            <button type="button" className="btn" disabled={busy || code.trim().length < 4} onClick={confirm}>Confirm group ({kes(total)})</button>
            <button type="button" className="btn danger" disabled={busy} onClick={() => setRej(!rej)}>Reject group</button>
          </div>
          {rej ? (
            <div className="row">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? (the customer is not told this)" maxLength={300} />
              <button type="button" className="btn danger" disabled={busy || reason.trim().length < 3} onClick={reject}>Reject now</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="muted">{first.status === 'confirmed' ? 'Confirmed' : 'Rejected: ' + (first.rejectReason || '')} | by {first.handledBy || '-'} {when(first.handledAt)}</div>
      )}
      {err ? <p className="err" role="alert">{err}</p> : null}
    </div>
  );
}

function RecordForm({ onDone }) {
  const [ref, setRef] = useState('');
  const [code, setCode] = useState('');
  const [amt, setAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true); setErr('');
    try {
      const r = await call('POST', '/orders/' + ref.trim().toUpperCase() + '/payments/record', { mpesaCode: code.trim().toUpperCase(), amountKes: Number(amt) });
      setRef(''); setCode(''); setAmt('');
      onDone('Recorded. ' + (r.emailed ? 'Customer emailed. ' : '') + (r.messageQueued ? 'Message queued.' : 'Message NOT queued.'));
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card">
      <h3>Record a payment</h3>
      <p className="muted">For a customer who paid without using the site. Check the till statement first.</p>
      <div className="row">
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Order number, e.g. ORD-000001" maxLength={12} />
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="M-Pesa code" maxLength={20} />
        <input value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Amount KES" inputMode="numeric" />
        <button type="button" className="btn" disabled={busy || !/^ORD-\d{6}$/i.test(ref.trim()) || code.trim().length < 4 || !amt} onClick={go}>Record payment</button>
      </div>
      {err ? <p className="err" role="alert">{err}</p> : null}
    </div>
  );
}

export default function Payments() {
  const [tab, setTab] = useState('awaiting');
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  function load(t) {
    setList(null); setErr('');
    call('GET', '/payments?status=' + t).then((d) => setList(d.payments || [])).catch((e) => setErr(e.message));
  }
  useEffect(() => { load(tab); }, [tab]);
  function done(m) { setNote(m); load(tab); }

  const groups = list ? group(list) : [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>Payments</h1>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '12px 0' }}>
        {TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} style={{ padding: '8px 18px', borderRadius: 999, border: '1px solid #0b2a4a', cursor: 'pointer', font: 'inherit', background: tab === k ? '#0b2a4a' : '#fff', color: tab === k ? '#fff' : '#0b2a4a' }}>{l}</button>)}
      </div>
      {note ? <p className="note" style={{ textAlign: 'center' }}>{note}</p> : null}
      {err ? <p className="err" role="alert">{err}</p> : null}
      {list === null ? <p className="center muted">Loading...</p> : groups.length === 0 ? <p className="center muted">Nothing here.</p> : groups.map((g) => (g.batchId ? <GroupCard key={g.key} g={g} onDone={done} /> : <PayCard key={g.key} p={g.items[0]} onDone={done} />))}
      <RecordForm onDone={done} />
    </div>
  );
}
