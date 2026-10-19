import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PasswordField } from '@pyfon/ui';
import { api, P, STEP_LABEL, STATUS_LABEL, kes, fmt } from './api.js';

const STEPS = ['finance_quote', 'creative', 'production', 'finance_delivery'];

export default function JobDetail() {
  const { ref } = useParams();
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [co, setCo] = useState({ email: '', password: '' });
  const [reason, setReason] = useState('');
  const [back, setBack] = useState('');
  const [toStage, setToStage] = useState('creative');
  const [price, setPrice] = useState('');
  const [mode, setMode] = useState('in_house');
  const [vendor, setVendor] = useState('');

  const load = useCallback(async () => {
    try { setD(await api.get(P + '/jobs/' + ref)); } catch (e) { setErr(e.message); }
  }, [ref]);
  useEffect(() => { load(); }, [load]);

  async function run(fn, ok) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); setCo({ email: '', password: '' }); } catch (e) { setErr(e.message); }
    load();
  }

  if (!d) return <p className="center">{err || 'Loading...'}</p>;
  const { job, steps, signatures, rejections, order, quote } = d;
  const cur = steps.find((s) => s.step === job.currentStep);
  const st = cur ? cur.status : null;
  const open = job.status === 'open';

  return (
    <div>
      <p><Link to="/">&larr; Back to work list</Link></p>
      <h1 className="center">{job.ref}</h1>
      <p className="center muted">{job.status === 'complete' ? 'Complete' : 'Now at: ' + (STEP_LABEL[job.currentStep] || job.currentStep)}</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}

      {order ? (
        <section className="card">
          <h2>Order {order.ref} &middot; {kes(order.totalKes)}</h2>
          <p>{order.contactName} &middot; <a href={'tel:' + order.contactPhone}>{order.contactPhone}</a>{order.contactEmail ? ' \u00b7 ' + order.contactEmail : ''}</p>
          {order.deliveryNotes ? <p className="muted">Notes: {order.deliveryNotes}</p> : null}
          {order.lines.map((l, i) => (
            <div className="row" key={i}>
              <span><b>{l.name}</b> ({l.sku}) x {l.qty}<br /><span className="muted">{fmt(l.options)}{l.personalization ? ' | ' + fmt(l.personalization) : ''}</span></span>
              <span>{kes(l.unitPriceKes)}</span>
            </div>
          ))}
        </section>
      ) : null}

      {quote ? (
        <section className="card">
          <h2>Quote request {quote.ref} &middot; {quote.kind}</h2>
          <p>{quote.contactName}{quote.companyName ? ' (' + quote.companyName + ')' : ''} &middot; <a href={'tel:' + quote.contactPhone}>{quote.contactPhone}</a></p>
          <p>Quantity: {quote.quantity || '-'} &middot; Price: {quote.quotedPriceKes ? kes(quote.quotedPriceKes) : 'not set yet'}</p>
          <p className="muted">{fmt(quote.spec)}</p>
          {quote.notes ? <p>Notes: {quote.notes}</p> : null}
        </section>
      ) : null}

      <section className="card">
        <h2>Steps</h2>
        {steps.map((s) => (
          <div className="row" key={s.step}>
            <span>{STEP_LABEL[s.step]}</span>
            <span className={'pill ' + s.status}>{STATUS_LABEL[s.status] || s.status}</span>
          </div>
        ))}
        {signatures.length ? <h3>Signatures</h3> : null}
        {signatures.map((s, i) => (
          <p className="muted" key={i}>
            {STEP_LABEL[s.step]}: {s.role === 'owner' ? 'signed' : 'co-signed'} by {s.partnerName} ({s.signerStage}){s.workspaceStage !== s.signerStage ? ' acting for ' + s.workspaceStage : ''} &middot; {new Date(s.signedAt).toLocaleString('en-KE')}
          </p>
        ))}
        {rejections.length ? <h3>Rejections</h3> : null}
        {rejections.map((r, i) => (
          <p className="muted" key={i}>{STEP_LABEL[r.step]}: "{r.reason}" by {r.rejectedBy}{r.sentBackTo ? ', sent back to ' + STEP_LABEL[r.sentBackTo] : ''}</p>
        ))}
      </section>

      {open && job.currentStep === 'finance_quote' && quote && st === 'active' ? (
        <section className="card">
          <h2>Set the quote price</h2>
          <input type="number" min="1" placeholder="Price in KES" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button type="button" onClick={() => run(() => api.post(P + '/jobs/' + ref + '/quote-price', { priceKes: parseInt(price, 10) }), 'Price saved')}>Save price</button>
        </section>
      ) : null}

      {open && job.currentStep === 'production' && st === 'active' ? (
        <section className="card">
          <h2>Who makes it?</h2>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="in_house">In-house (Pyfon Brands)</option>
            <option value="dealer">A dealer</option>
          </select>
          {mode === 'dealer' ? <input placeholder="Dealer code" value={vendor} onChange={(e) => setVendor(e.target.value)} /> : null}
          <button type="button" onClick={() => run(() => api.post(P + '/jobs/' + ref + '/production', mode === 'dealer' ? { mode, vendorCode: vendor } : { mode }), 'Assignment saved')}>Save</button>
        </section>
      ) : null}

      {open && st === 'active' ? (
        <section className="card">
          <h2>Sign off {STEP_LABEL[job.currentStep]}</h2>
          <p className="muted">This is the first signature. A second partner must co-sign.</p>
          <button type="button" onClick={() => run(() => api.post(P + '/jobs/' + ref + '/sign-off'), 'Signed. Now needs a second partner.')}>Sign off</button>
        </section>
      ) : null}

      {open && st === 'awaiting_cosign' ? (
        <section className="card">
          <h2>Second signature needed</h2>
          <h3>Option 1: second partner signs here</h3>
          <input type="email" placeholder="Second partner email" value={co.email} onChange={(e) => setCo({ ...co, email: e.target.value })} />
          <PasswordField label="Second partner password" value={co.password} onChange={(e) => setCo({ ...co, password: e.target.value })} autoComplete="off" />
          <button type="button" onClick={() => run(() => api.post(P + '/jobs/' + ref + '/cosign', co), 'Co-signed. Step complete.')}>Co-sign now</button>
          <h3>Option 2: ask from their own device</h3>
          <select value={toStage} onChange={(e) => setToStage(e.target.value)}>
            <option value="creative">Creative partner</option>
            <option value="production">Production partner</option>
            <option value="finance">Finance partner</option>
          </select>
          <button type="button" onClick={() => run(() => api.post(P + '/jobs/' + ref + '/cosign-request', { toStage }), 'Request sent. They approve it on their home screen.')}>Send approval request</button>
        </section>
      ) : null}

      {open && (st === 'active' || st === 'awaiting_cosign') ? (
        <section className="card">
          <h2>Reject this step</h2>
          <input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <select value={back} onChange={(e) => setBack(e.target.value)}>
            <option value="">Send back: let the system choose</option>
            {STEPS.map((s) => <option key={s} value={s}>{STEP_LABEL[s]}</option>)}
          </select>
          <button type="button" className="danger" onClick={() => run(() => api.post(P + '/jobs/' + ref + '/reject', back ? { reason, sendBackTo: back } : { reason }), 'Rejected and sent back')}>Reject</button>
        </section>
      ) : null}
    </div>
  );
}
