import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './od.css';
import PayPanel from './PayPanel.jsx';
import OrdersTable from './OrdersTable.jsx';
import { useAuth } from './store.jsx';
import { API_URL, STORE, tokens } from './api.js';

const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const KIND = { service: 'Print service', bulk: 'Bulk order', corporate: 'Corporate order', design: 'Design request' };

async function load(path) {
  const t = await tokens.get();
  const r = await fetch(API_URL + path, { headers: { 'X-Interface': STORE, Authorization: 'Bearer ' + t } });
  if (!r.ok) throw new Error(r.status === 401 ? 'Please sign in again.' : 'Could not load (' + r.status + ')');
  return r.json();
}

function pairs(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).filter(([, v]) => v !== '' && v != null).map(([k, v]) => k + ': ' + v);
}

function when(d) {
  try { return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

function Steps({ t }) {
  const list = (t && t.stages) || [];
  return (
    <ol className="od-steps">
      {list.map((s) => (
        <li key={s.key} className={'od-s-' + s.state}>
          <span className="od-dot" />
          <span>{s.label}</span>
          {s.state !== 'todo' && s.at ? <span className="od-muted">{when(s.at)}</span> : null}
          {s.state === 'current' && s.note ? <span className="od-note">{s.note}</span> : null}
        </li>
      ))}
    </ol>
  );
}

function OrderCard({ o }) {
  const d = o.delivery || {};
  const fee = d.feeKes == null ? 'cost to be confirmed' : d.feeKes === 0 ? 'no charge' : kes(d.feeKes);
  return (
    <div className="od-card">
      <div className="od-head"><h3>{o.ref}</h3><span className="od-muted">{when(o.createdAt)}</span></div>
      <div className="od-badge">{o.tracking && o.tracking.currentLabel ? o.tracking.currentLabel : o.progress}</div>
      {o.tracking ? <Steps t={o.tracking} /> : null}
      <ul className="od-lines">
        {(o.lines || []).map((l) => {
          const extra = pairs(l.options).concat(pairs(l.personalization));
          return (
            <li key={l.lineId}>
              {l.name} x {l.qty}{l.unitPriceKes != null ? ' (' + kes(l.unitPriceKes) + ' each)' : ''}
              {extra.length ? <div className="od-muted">{extra.join(' | ')}</div> : null}
              {l.designName ? <div className="od-muted">Design: {l.designName}</div> : null}
              {l.files && l.files.length ? <div className="od-muted">{l.files.length} file(s) attached</div> : null}
            </li>
          );
        })}
      </ul>
      <p className="od-muted">Delivery: {d.label || 'not set'} ({fee}){d.address ? ', ' + d.address : ''}{d.notes ? '. Notes: ' + d.notes : ''}</p>
      <p className="od-total">Total: {kes(o.totalKes)}</p>
      <PayPanel orderRef={o.ref} iface={STORE} />
    </div>
  );
}

function QuoteCard({ q }) {
  const spec = pairs(q.spec);
  return (
    <div className="od-card">
      <div className="od-head"><h3>{q.ref}</h3><span className="od-muted">{when(q.createdAt)}</span></div>
      <div className="od-badge">{q.progress}</div>
      <p className="od-muted">{KIND[q.kind] || q.kind}</p>
      {q.item ? <p>Item: {q.item}</p> : null}
      {q.quantity ? <p>Quantity: {q.quantity}</p> : null}
      {q.companyName ? <p>Company: {q.companyName}</p> : null}
      {spec.length ? <p className="od-muted">{spec.join(' | ')}</p> : null}
      {q.notes ? <p className="od-muted">Notes: {q.notes}</p> : null}
      {q.files && q.files.length ? <p className="od-muted">{q.files.length} file(s) attached</p> : null}
      {q.quotedPriceKes != null ? <p className="od-total">Quoted price: {kes(q.quotedPriceKes)}</p> : <p className="od-muted">Price not quoted yet. We will reply on WhatsApp.</p>}
    </div>
  );
}

export default function Orders() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState(null);
  const [quotes, setQuotes] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    load('/v1/customer/orders').then((d) => setOrders(d.orders || [])).catch((e) => setErr(e.message));
    load('/v1/customer/quote-requests').then((d) => setQuotes(d.quoteRequests || [])).catch((e) => setErr(e.message));
  }, [user]);

  if (!ready) return <div className="od od-center"><p className="od-muted">Loading...</p></div>;
  if (!user) {
    return (
      <div className="od od-center">
        <h1>My orders</h1>
        <p><Link to="/account?next=/orders">Sign in</Link> to see your orders and quotes.</p>
        <p>Or <Link to="/track">track an order with its number and phone</Link>.</p>
      </div>
    );
  }
  return (
    <div className="od">
      <h1>My orders</h1>
      {err ? <p className="od-err" role="alert">{err}</p> : null}
      <h2>Orders</h2>
      {orders === null ? <p className="od-muted od-center">Loading...</p> : orders.length === 0 ? <p className="od-muted od-center">No orders yet.</p> : <OrdersTable orders={orders} iface={STORE} />}
      <h2>Quote requests</h2>
      {quotes === null ? <p className="od-muted od-center">Loading...</p> : quotes.length === 0 ? <p className="od-muted od-center">No quote requests yet.</p> : quotes.map((q) => <QuoteCard key={q.ref} q={q} />)}
      <p className="od-center"><Link to="/shop">Keep shopping</Link></p>
    </div>
  );
}
