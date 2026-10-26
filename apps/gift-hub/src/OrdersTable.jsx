import { Fragment, useEffect, useState } from 'react';
import './ot.css';
import { API_URL, tokens } from './api.js';

const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const KIND = { service: 'Print service', bulk: 'Bulk order', corporate: 'Corporate order', design: 'Design request' };

function when(d) {
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

async function call(iface, method, path, body) {
  const t = await tokens.get();
  const r = await fetch(API_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Interface': iface, Authorization: 'Bearer ' + t },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || 'Something went wrong (' + r.status + ')');
  return d;
}

function pairs(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).filter(([, v]) => v !== '' && v != null).map(([k, v]) => k + ': ' + v);
}

function itemsText(lines) {
  const ls = lines || [];
  if (!ls.length) return '-';
  const first = ls[0].name + ' x ' + ls[0].qty;
  return ls.length > 1 ? first + ' +' + (ls.length - 1) + ' more' : first;
}

function Stepper({ t }) {
  const list = (t && t.stages) || [];
  return (
    <ol className="ot-steps">
      {list.map((s) => (
        <li key={s.key} className={'ot-step ' + (s.state === 'todo' ? 'todo' : s.state === 'current' ? 'now' : 'done')}>
          <span className="ot-lab">{s.label}</span>
          {s.state !== 'todo' && s.at ? <span className="ot-when">{when(s.at)}</span> : null}
          {s.state === 'current' && s.note ? <span className="ot-note">{s.note}</span> : null}
        </li>
      ))}
    </ol>
  );
}

export default function OrdersTable({ orders, quotes = [], iface }) {
  const [sum, setSum] = useState(null);
  const [open, setOpen] = useState('');
  const [pick, setPick] = useState({});
  const [pay, setPay] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  function reload() {
    return call(iface, 'GET', '/v1/customer/payments/summary').then(setSum).catch(() => setSum({ till: null, orders: [] }));
  }
  useEffect(() => { reload(); }, []);

  const by = {};
  ((sum && sum.orders) || []).forEach((x) => { by[x.orderRef] = x; });
  const canPay = (o) => { const x = by[o.ref]; return Boolean(sum && sum.till && x && !x.cancelled && !x.waiting && x.dueKes > 0); };
  const list = orders.filter(canPay);
  const chosen = list.filter((o) => pick[o.ref]);
  const chosenKes = chosen.reduce((a, o) => a + by[o.ref].dueKes, 0);
  const allKes = list.reduce((a, o) => a + by[o.ref].dueKes, 0);
  const cols = list.length > 1 ? 9 : 8;

  const rows = []
    .concat(orders.map((o) => ({ k: 'o', ref: o.ref, at: o.createdAt, o })))
    .concat(quotes.map((q) => ({ k: 'q', ref: q.ref, at: q.createdAt, q })))
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  function startPay(refs) {
    setPay({ refs, amount: refs.reduce((a, r) => a + by[r].dueKes, 0) });
    setErr(''); setNote('');
  }
  async function paid() {
    setBusy(true); setErr('');
    try {
      const r = await call(iface, 'POST', '/v1/customer/payments/claim-many', { orderRefs: pay.refs });
      if (!r.okCount) {
        setErr((r.results[0] && r.results[0].error) || 'Could not send. Please try again.');
      } else {
        setNote(r.message); setPay(null); setPick({});
        await reload();
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="ot">
      {note ? <p className="ot-top">{note}</p> : null}
      {list.length > 1 ? (
        <div className="ot-bar">
          <span>{list.length} orders waiting for payment: <b>{kes(allKes)}</b></span>
          <span>
            <button type="button" className="ot-btn" onClick={() => setPick(Object.fromEntries(list.map((o) => [o.ref, true])))}>Select all</button>{' '}
            <button type="button" className="ot-btn ot-solid" disabled={!chosen.length} onClick={() => startPay(chosen.map((o) => o.ref))}>Pay selected ({chosen.length}): {kes(chosenKes)}</button>
          </span>
        </div>
      ) : null}
      {pay && sum ? (
        <div className="ot-pay">
          <strong>Pay {kes(pay.amount)} for {pay.refs.length} order{pay.refs.length === 1 ? '' : 's'}: {pay.refs.join(', ')}</strong>
          <ol style={{ paddingLeft: 18 }}>
            <li>Open M-Pesa, choose Lipa na M-Pesa, then Buy Goods and Services.</li>
            <li>Till number: <strong>{sum.till}</strong> ({sum.tillName})</li>
            <li>Amount: <strong>{kes(pay.amount)}</strong>. Enter your PIN.</li>
            <li>When M-Pesa confirms, tap the button below. That is all.</li>
          </ol>
          {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
          <button type="button" className="ot-btn ot-solid" disabled={busy} onClick={paid}>{busy ? 'Sending...' : 'I have paid'}</button>{' '}
          <button type="button" className="ot-btn" onClick={() => setPay(null)}>Cancel</button>
        </div>
      ) : null}
      <div className="ot-wrap">
        <table className="ot-tbl">
          <thead>
            <tr>
              {list.length > 1 ? <th /> : null}
              <th>Order</th><th>Date</th><th>Items</th><th className="ot-num">Total</th><th className="ot-num">Due</th><th>Status</th><th>Track</th><th>Pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              if (r.k === 'q') {
                const q = r.q;
                const spec = pairs(q.spec);
                return (
                  <Fragment key={q.ref}>
                    <tr>
                      {list.length > 1 ? <td /> : null}
                      <td><b>{q.ref}</b><span className="ot-tag">Quote</span></td>
                      <td>{when(q.createdAt)}</td>
                      <td className="ot-items">{q.item || KIND[q.kind] || 'Quote request'}{q.quantity ? ' x ' + q.quantity : ''}</td>
                      <td className="ot-num">{q.quotedPriceKes != null ? kes(q.quotedPriceKes) : 'To be quoted'}</td>
                      <td className="ot-num">{q.quotedPriceKes != null ? kes(q.quotedPriceKes) : '-'}</td>
                      <td><span className="ot-chip">{q.progress}</span></td>
                      <td><button type="button" className="ot-btn" onClick={() => setOpen(open === q.ref ? '' : q.ref)}>{open === q.ref ? 'Hide' : 'Details'}</button></td>
                      <td>-</td>
                    </tr>
                    {open === q.ref ? (
                      <tr className="ot-detail">
                        <td colSpan={cols}>
                          <p>{KIND[q.kind] || q.kind}{q.companyName ? ' for ' + q.companyName : ''}</p>
                          {q.item ? <p>Item: {q.item}{q.quantity ? ' x ' + q.quantity : ''}</p> : null}
                          {spec.length ? <p>{spec.join(' | ')}</p> : null}
                          {q.notes ? <p>Notes: {q.notes}</p> : null}
                          {q.files && q.files.length ? <p>{q.files.length} file(s) attached</p> : null}
                          <p>{q.quotedPriceKes != null ? 'Quoted price: ' + kes(q.quotedPriceKes) : 'Price not quoted yet. We will reply on WhatsApp.'}</p>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              }
              const o = r.o;
              const x = by[o.ref];
              const d = o.delivery || {};
              return (
                <Fragment key={o.ref}>
                  <tr>
                    {list.length > 1 ? (
                      <td>{canPay(o) ? <input type="checkbox" checked={Boolean(pick[o.ref])} onChange={() => setPick((s) => ({ ...s, [o.ref]: !s[o.ref] }))} aria-label={'Select ' + o.ref} /> : null}</td>
                    ) : null}
                    <td><b>{o.ref}</b></td>
                    <td>{when(o.createdAt)}</td>
                    <td className="ot-items">{itemsText(o.lines)}</td>
                    <td className="ot-num">{kes(o.totalKes)}</td>
                    <td className="ot-num">{x ? kes(x.dueKes) : ''}</td>
                    <td><span className="ot-chip">{o.tracking && o.tracking.currentLabel ? o.tracking.currentLabel : o.progress}</span></td>
                    <td><button type="button" className="ot-btn" onClick={() => setOpen(open === o.ref ? '' : o.ref)}>{open === o.ref ? 'Hide' : 'Track'}</button></td>
                    <td>
                      {!x ? null : x.cancelled ? '-' : x.dueKes <= 0 ? <span className="ot-chip ok">Paid</span> : x.waiting ? <span className="ot-chip">Checking</span> : sum && sum.till ? <button type="button" className="ot-btn ot-solid" onClick={() => startPay([o.ref])}>Pay</button> : null}
                    </td>
                  </tr>
                  {open === o.ref ? (
                    <tr className="ot-detail">
                      <td colSpan={cols}>
                        {o.tracking ? <Stepper t={o.tracking} /> : <p>{o.progress}</p>}
                        <ul>
                          {(o.lines || []).map((l) => {
                            const extra = pairs(l.options).concat(pairs(l.personalization));
                            return <li key={l.lineId}>{l.name} x {l.qty}{l.unitPriceKes != null ? ' (' + kes(l.unitPriceKes) + ' each)' : ''}{extra.length ? ' - ' + extra.join(' | ') : ''}</li>;
                          })}
                        </ul>
                        <p>Delivery: {d.label || 'not set'}{d.address ? ', ' + d.address : ''}{d.notes ? '. Notes: ' + d.notes : ''}</p>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
