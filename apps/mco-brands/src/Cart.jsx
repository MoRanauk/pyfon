import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatKES, TextField } from '@pyfon/ui';
import { api, img } from './api.js';
import { useCart } from './CartState.jsx';
import { useAuth } from './AuthState.jsx';
import { errText } from './util.js';

const PHONE = /^\+?[0-9 ]{9,15}$/;

export default function Cart() {
  const { lines, setQty, remove, clear, total } = useCart();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Enter your name.');
    if (!PHONE.test(phone.trim())) return setErr('Enter a valid phone number, 9 to 15 digits.');
    setBusy(true);
    try {
      const body = {
        contactName: name.trim(),
        contactPhone: phone.trim(),
        lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, personalization: l.text ? { text: l.text } : {} }))
      };
      if (email.trim()) body.contactEmail = email.trim();
      if (notes.trim()) body.deliveryNotes = notes.trim();
      const d = await api.customer.createOrder(body);
      setDone({ ref: d.order && d.order.ref, url: d.whatsappUrl });
      clear();
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="wrap section">
        <h2>Order saved</h2>
        {done.ref ? <p>Your order reference is <strong>{done.ref}</strong>.</p> : null}
        <p>Last step: send the order to us on WhatsApp so we can confirm price and payment.</p>
        <a className="btn" href={done.url} target="_blank" rel="noreferrer">Send on WhatsApp</a>
        <p><Link to="/shop">Keep shopping</Link></p>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="wrap section">
        <h2>Your cart is empty</h2>
        <Link to="/shop">Browse the shop</Link>
      </div>
    );
  }

  return (
    <div className="wrap section">
      <h2>Your cart</h2>
      <div className="cartlist">
        {lines.map((l) => (
          <div className="cartline" key={l.key}>
            <img src={img(l.image)} alt="" />
            <div style={{ flex: 1 }}>
              <strong>{l.name}</strong>
              {l.text ? <div className="muted">Text: {l.text}</div> : null}
              <div className="muted">{formatKES(l.priceKes)} each</div>
            </div>
            <input type="number" min={l.minOrderQty || 1} value={l.qty} onChange={(e) => setQty(l.key, parseInt(e.target.value, 10))} aria-label="Quantity" />
            <strong>{formatKES(l.priceKes * l.qty)}</strong>
            <button type="button" className="linkbtn" onClick={() => remove(l.key)}>Remove</button>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 20 }}>Total: <strong>{formatKES(total)}</strong></p>

      {!user ? (
        <div className="banner">
          <p>Please sign in so we can keep your order safe and let you follow it.</p>
          <Link className="btn" to="/account?next=/cart">Sign in or sign up</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="formcol">
          <h3>Your details</h3>
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Phone (for WhatsApp)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
          <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Delivery notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place order'}</button>
        </form>
      )}
    </div>
  );
}
