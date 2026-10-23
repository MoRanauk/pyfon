import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthState.jsx';
import { API_URL, tokens } from './api.js';

const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const KIND = { service: 'Print service', bulk: 'Bulk order', corporate: 'Corporate order', design: 'Co. Brand design' };

async function load(path) {
  const t = await tokens.get();
  const r = await fetch(API_URL + path, { headers: { 'X-Interface': 'mco', Authorization: 'Bearer ' + t } });
  if (!r.ok) throw new Error('Could not load (' + r.status + ')');
  return r.json();
}

function pairs(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).filter(([, v]) => v !== '' && v != null).map(([k, v]) => k + ': ' + v);
}

function when(d) {
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

function TrackingLine({ t }) {
  return (
    <ol className="track">
      {t.stages.map((s) => (
        <li key={s.key} className={'tstep ' + s.state}>
          <span className="dot" />
          <span className="tlabel">{s.label}</span>
          {s.state !== 'todo' && s.at ? <span className="tdate">{when(s.at)}</span> : null}
          {s.state === 'current' ? <span className="tnote">{s.note}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function OrderCard({ o }) {
  const d = o.delivery || {};
  const fee = d.feeKes == null ? 'cost to be confirmed' : d.feeKes === 0 ? 'no charge' : kes(d.feeKes);
  return (
    <div className="ocard">
      <h3>{o.ref} <span className="muted">{when(o.createdAt)}</span></h3>
      <p><strong>{o.tracking ? o.tracking.currentLabel : o.progress}</strong></p>
      {o.tracking ? <TrackingLine t={o.tracking} /> : null}
      <ul>
        {o.lines.map((l) => {
          const extra = pairs(l.options).concat(pairs(l.personalization));
          return (
            <li key={l.lineId}>
              {l.name} x {l.qty}{l.unitPriceKes != null ? ' (' + kes(l.unitPriceKes) + ' each)' : ''}
              {extra.length ? <div className="muted">{extra.join(' | ')}</div> : null}
              {l.designName ? <div className="muted">Design: {l.designName}</div> : null}
              {l.files && l.files.length ? <div className="muted">{l.files.length} file(s) attached</div> : null}
            </li>
          );
        })}
      </ul>
      <p className="muted">Delivery: {d.label || 'not set'} ({fee}){d.address ? ', ' + d.address : ''}{d.notes ? '. Notes: ' + d.notes : ''}</p>
      <p><strong>Total: {kes(o.totalKes)}</strong></p>
    </div>
  );
}

function QuoteCard({ q }) {
  const spec = pairs(q.spec);
  return (
    <div className="ocard">
      <h3>{q.ref} <span className="muted">{when(q.createdAt)}</span></h3>
      <p><strong>{q.progress}</strong> <span className="muted">({KIND[q.kind] || q.kind}, {q.status})</span></p>
      {q.item ? <p>Item: {q.item}</p> : null}
      {q.quantity ? <p>Quantity: {q.quantity}</p> : null}
      {q.companyName ? <p>Company: {q.companyName}</p> : null}
      {spec.length ? <p className="muted">{spec.join(' | ')}</p> : null}
      {q.notes ? <p className="muted">Notes: {q.notes}</p> : null}
      {q.files && q.files.length ? <p className="muted">{q.files.length} file(s) attached</p> : null}
      {q.quotedPriceKes != null ? <p><strong>Quoted price: {kes(q.quotedPriceKes)}</strong></p> : <p className="muted">Price not quoted yet. We will reply on WhatsApp.</p>}
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    load('/v1/customer/orders').then((d) => setOrders(d.orders || [])).catch((e) => setErr(e.message));
    load('/v1/customer/quote-requests').then((d) => setQuotes(d.quoteRequests || [])).catch((e) => setErr(e.message));
  }, [user]);

  if (!user) {
    return (
      <div className="orders">
        <h1>My orders and quotes</h1>
        <p><Link to="/account?next=/orders">Sign in</Link> to see your orders and quotes.</p>
        <p>Or <Link to="/track">track an order with its number and phone</Link>.</p>
      </div>
    );
  }

  return (
    <div className="orders">
      <h1>My orders and quotes</h1>
      {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
      <h2>Orders</h2>
      {orders === null ? <p className="muted">Loading...</p> : orders.length === 0 ? <p className="muted">No orders yet.</p> : orders.map((o) => <OrderCard key={o.ref} o={o} />)}
      <h2>Quote requests</h2>
      {quotes === null ? <p className="muted">Loading...</p> : quotes.length === 0 ? <p className="muted">No quote requests yet.</p> : quotes.map((q) => <QuoteCard key={q.ref} q={q} />)}
      <p><Link to="/account">Back to my account</Link></p>
    </div>
  );
}
