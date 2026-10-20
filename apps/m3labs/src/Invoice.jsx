import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { STAGE, kes } from './api.js';
import { get, post, patch } from './http.js';
import { call, today } from './moneyApi.js';

export default function Invoice() {
  const { ref } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [f, setF] = useState({ discount: '0', date: '', mode: '', notes: '' });
  const base = '/v1/partner';
  const [pay, setPay] = useState({ income: 0, cost: 0, amount: '' });

  const load = useCallback(async () => {
    try {
      const x = await get(base + '/jobs/' + ref + '/invoice');
      setD(x);
      try {
        const m = await call('GET', '/money/by-job?from=2000-01-01&to=' + today());
        const row = m.jobs.find((j) => j.jobRef === ref);
        setPay({ income: row ? Number(row.income) : 0, cost: row ? Number(row.cost) : 0, amount: '' });
      } catch (e2) { setPay({ income: 0, cost: 0, amount: '' }); }
      if (x.invoice) setF({ discount: String(x.invoice.discountKes || 0), date: x.invoice.handoverDate || '', mode: x.invoice.handoverMode || '', notes: x.invoice.notes || '' });
    } catch (e) { setErr(e.message); }
  }, [ref]);
  useEffect(() => { load(); }, [load]);

  async function run(fn, ok) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); } catch (e) { setErr(e.message); }
    load();
  }
  if (STAGE !== 'finance' || !d) return null;

  const inv = d.invoice;
  const src = inv || d.draft;
  const other = src ? (inv ? inv.otherChargesKes : src.otherChargesKes) : 0;
  return (
    <section className="card inv">
      <h2>{inv ? 'Invoice ' + inv.number : 'Invoice'}</h2>
      {msg ? <p className="ok">{msg}</p> : null}
      {err ? <p className="err">{err}</p> : null}
      {pay.income || pay.cost ? <p className="muted"><b>Job money:</b> income {kes(pay.income)} &middot; costs {kes(pay.cost)} &middot; profit <b>{kes(pay.income - pay.cost)}</b></p> : null}
      {!src ? <p className="muted">{d.reason || 'Nothing to invoice yet.'}</p> : (
        <div>
          <p>{src.billName}{src.billPhone ? ' \u00b7 ' + src.billPhone : ''}{src.billEmail ? ' \u00b7 ' + src.billEmail : ''}</p>
          {src.lines.map((l, i) => (
            <div className="row" key={i}><span>{l.name} x {l.qty}</span><span>{kes(l.unitPriceKes * l.qty)}</span></div>
          ))}
          {other > 0 ? <div className="row"><span>Delivery and other charges</span><span>{kes(other)}</span></div> : null}
          {inv && inv.discountKes > 0 ? <div className="row"><span>Discount</span><span>- {kes(inv.discountKes)}</span></div> : null}
          <div className="row"><b>Total</b><b>{kes(src.totalKes)}</b></div>
        </div>
      )}
      {!inv && d.draft ? (
        <div>
          <input placeholder="Note on the invoice (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="button" onClick={() => run(() => post(base + '/jobs/' + ref + '/invoice', notes ? { notes } : {}), 'Invoice created. Add the details below.')}>Create invoice</button>
        </div>
      ) : null}
      {inv ? (
        <div>
          <h3>Details</h3>
          <input type="number" min="0" placeholder="Discount in KES (needs all three partners)" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} />
          <button type="button" onClick={() => run(() => post('/v1/partner/approvals', { action: 'invoice_discount', payload: { invoiceId: String(inv.id), discountKes: parseInt(f.discount || '0', 10) } }), 'Discount sent for approval. All three partners must approve it on the Approvals page.')}>Ask for discount approval</button>
          <select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option value="">Pick-up or delivery: use the order</option>
            <option value="pickup">Pick-up</option>
            <option value="delivery">Delivery</option>
          </select>
          <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <input placeholder="Message to the customer (optional)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <button type="button" onClick={() => run(() => patch(base + '/invoices/' + inv.id, { discountKes: inv.discountKes || 0, handoverDate: f.date || null, handoverMode: f.mode || null, notes: f.notes || null }), 'Details saved')}>Save details</button>
          <h3>Payment</h3>
          <p className="muted">Paid so far {kes(pay.income)} of {kes(inv.totalKes)}{pay.income >= inv.totalKes ? ' (paid in full)' : ''}</p>
          {pay.income < inv.totalKes ? (
            <div>
              <input type="number" min="1" placeholder={'Amount received (empty = balance due ' + (inv.totalKes - pay.income) + ')'} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <button type="button" onClick={() => run(async () => {
                const due = inv.totalKes - pay.income;
                const a = pay.amount ? Number(pay.amount) : due;
                if (!(a > 0) || !Number.isInteger(a)) throw new Error('Enter a whole amount above zero');
                if (a > due) throw new Error('That is more than the balance due');
                await call('POST', '/money/entries', { date: today(), kind: 'income', category: 'Sales', amountKes: a, jobRef: inv.jobRef, party: inv.billName, note: 'Payment for invoice ' + inv.number });
              }, 'Payment recorded in the Money book')}>Record payment as income</button>
            </div>
          ) : null}
          <p className="muted">{inv.emailedAt ? 'Emailed ' + new Date(inv.emailedAt).toLocaleString('en-KE') : 'Not emailed yet'}</p>
          <button type="button" onClick={() => nav('/invoice/' + inv.id)}>Open invoice sheet</button>
          <button type="button" onClick={() => run(() => post(base + '/invoices/' + inv.id + '/email'), 'Invoice emailed')}>Email to customer</button>
          <input placeholder="Reason to void (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button type="button" className="danger" onClick={() => run(() => post(base + '/invoices/' + inv.id + '/void', { reason }), 'Invoice voided')}>Void invoice</button>
        </div>
      ) : null}
    </section>
  );
}
