import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './od.css';
import OrdersTable from './OrdersTable.jsx';
import { useAuth } from './store.jsx';
import { API_URL, STORE, tokens } from './api.js';

async function load(path) {
  const t = await tokens.get();
  const r = await fetch(API_URL + path, { headers: { 'X-Interface': STORE, Authorization: 'Bearer ' + t } });
  if (!r.ok) throw new Error(r.status === 401 ? 'Please sign in again.' : 'Could not load (' + r.status + ')');
  return r.json();
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
        <p><Link to="/account?next=/orders">Sign in</Link> to see your orders.</p>
        <p>Or <Link to="/track">track an order with its number and phone</Link>.</p>
      </div>
    );
  }
  const ready2 = orders !== null && quotes !== null;
  return (
    <div className="od od-wide">
      <h1>My orders</h1>
      {err ? <p className="od-err" role="alert">{err}</p> : null}
      {!ready2 ? <p className="od-muted od-center">Loading...</p> : orders.length + quotes.length === 0 ? <p className="od-muted od-center">No orders yet.</p> : <OrdersTable orders={orders} quotes={quotes} iface={STORE} />}
      <p className="od-center"><Link to="/shop">Keep shopping</Link></p>
    </div>
  );
}
