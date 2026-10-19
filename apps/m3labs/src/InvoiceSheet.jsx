import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { kes } from './api.js';
import { get } from './http.js';
import { INVOICE_INFO as I } from './invoiceInfo.js';

const day = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'To be confirmed');

export default function InvoiceSheet() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { get('/v1/partner/invoices/' + id + '/document').then(setD).catch((e) => setErr(e.message)); }, [id]);
  if (!d) return <p className="center">{err || 'Loading...'}</p>;
  const { invoice: v, delivery, servedBy, dispatchedBy } = d;
  const mode = v.handoverMode || (delivery ? (delivery.method === 'pickup' ? 'pickup' : 'delivery') : null);
  const gross = v.lines.reduce((a, l) => a + l.unitPriceKes * l.qty, 0) + v.otherChargesKes;
  return (
    <div>
      <p className="noprint">
        <Link to={'/jobs/' + v.jobRef}>&larr; Back to job</Link>{' '}
        <button type="button" onClick={() => window.print()}>Print or save as PDF</button>
      </p>
      <div className="sheet">
        <div className="sheet-head">
          <img src="/pyfon-logo.png" alt="Pyfon Brands" />
          <div className="sheet-no">
            <h1>INVOICE</h1>
            <p><b>{v.number}</b></p>
            <p>Date: {day(String(v.createdAt).slice(0, 10))}</p>
            <p>Job: {v.jobRef}</p>
            {v.status === 'void' ? <p className="err"><b>VOID</b></p> : null}
          </div>
        </div>
        <div className="sheet-two">
          <div>
            <h4>Billed to</h4>
            <p><b>{v.billName}</b></p>
            {v.billPhone ? <p>{v.billPhone}</p> : null}
            {v.billEmail ? <p>{v.billEmail}</p> : null}
          </div>
          <div>
            <h4>{mode === 'delivery' ? 'Delivery' : mode === 'pickup' ? 'Pick-up' : 'Pick-up or delivery'}</h4>
            <p>{day(v.handoverDate)}</p>
            {mode === 'delivery' && delivery && delivery.address ? <p>{delivery.address}</p> : null}
          </div>
        </div>
        <table className="sheet-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
          <tbody>
            {v.lines.map((l, i) => (
              <tr key={i}><td>{l.name}<br /><span className="muted">{l.sku}</span></td><td>{l.qty}</td><td>{kes(l.unitPriceKes)}</td><td>{kes(l.unitPriceKes * l.qty)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="sheet-sum">
          {v.otherChargesKes > 0 ? <p><span>Delivery and other charges</span><span>{kes(v.otherChargesKes)}</span></p> : null}
          {v.discountKes > 0 ? <p><span>Subtotal</span><span>{kes(gross)}</span></p> : null}
          {v.discountKes > 0 ? <p><span>Discount</span><span>- {kes(v.discountKes)}</span></p> : null}
          <p className="sheet-total"><span>Total due</span><span>{kes(v.totalKes)}</span></p>
        </div>
        <div className="sheet-two">
          <div><h4>How to pay</h4><p>Amount to pay: <b>{kes(v.totalKes)}</b></p>{I.payment.map((x, i) => <p key={i}>{x}</p>)}</div>
          <div><h4>Contact us</h4>{I.contact.concat(I.socials).map((x, i) => <p key={i}>{x}</p>)}</div>
        </div>
        <div className="sheet-two">
          <div><p>Served by: <b>{servedBy || '-'}</b></p></div>
          <div><p>Dispatched by: <b>{dispatchedBy || 'Not yet dispatched'}</b></p></div>
        </div>
        <p className="sheet-msg">{v.notes || I.message}</p>
        <p className="sheet-foot">{I.tagline}<br />Operated by Pyfon Brands<br />{'Built and owned by Emlabs \u00b7 \u00a9 Emlabs. All rights reserved.'}</p>
      </div>
    </div>
  );
}
