import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatKES, TextField } from '@pyfon/ui';
import { api, img } from './api.js';
import { useCart } from './CartState.jsx';
import { useAuth } from './AuthState.jsx';
import { DELIVERY } from './delivery.js';
import { errText } from './util.js';

const PHONE = /^\+?[0-9 ]{9,15}$/;

export default function Cart() {
  const { lines, setQty, remove, clear, total } = useCart();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('pickup');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const del = DELIVERY.find((d) => d.code === method) || DELIVERY[0];
  const fee = del.feeKes;
  const grand = total + (fee || 0);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Enter your name.');
    if (!PHONE.test(phone.trim())) return setErr('Enter a valid phone number, 9 to 15 digits.');
    if (del.needsAddress && address.trim().length < 5) return setErr('Enter your delivery address.');
    setBusy(true);
    try {
      const body = {
        contactName: name.trim(),
        contactPhone: phone.trim(),
        deliveryMethod: method,
        lines: lines.map((l) => ({
          sku: l.sku,
          qty: l.qty,
          options: l.options || {},
          personalization: l.text ? { text: l.text } : {},
          designId: l.design ? l.design.id : undefined
        }))
      };
      if (email.trim()) body.contactEmail = email.trim();
      if (del.needsAddress) body.deliveryAddress = address.trim();
      if (notes.trim()) body.deliveryNotes = notes.trim();
      const d = await api.customer.createOrder(body);
      setDone({ order: d.order, url: d.whatsappUrl });
      clear();
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const o = done.order || {};
    return (
      <div className="wrap section">
        <h2>Order saved</h2>
        {o.ref ? <p>Your order reference is <strong>{o.ref}</strong>.</p> : null}
        {o.totalKes != null ? (
          <p>
            Items {formatKES(o.itemsKes)} + delivery {o.deliveryFeeKes == null ? 'to be confirmed' : formatKES(o.deliveryFeeKes)}
            {o.deliveryFeeKes == null ? '' : ' = ' + formatKES(o.totalKes)}.
          </p>
        ) : null}
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
        {lines.map((l) => {
          const opts = Object.entries(l.options || {}).map(([k, v]) => k + ': ' + v).join(', ');
          return (
            <div className="cartline" key={l.key}>
              <img src={img(l.image)} alt="" />
              <div style={{ flex: 1 }}>
                <strong>{l.name}</strong>
                {opts ? <div className="muted">{opts}</div> : null}
                {l.text ? <div className="muted">Text: {l.text}</div> : null}
                {l.design ? <div className="muted">Design: {l.design.name}</div> : null}
                <div className="muted">{formatKES(l.priceKes)} each</div>
              </div>
              <input type="number" min={l.minOrderQty || 1} value={l.qty} onChange={(e) => setQty(l.key, parseInt(e.target.value, 10))} aria-label="Quantity" />
              <strong>{formatKES(l.priceKes * l.qty)}</strong>
              <button type="button" className="linkbtn" onClick={() => remove(l.key)}>Remove</button>
            </div>
          );
        })}
      </div>

      {!user ? (
        <>
          <p style={{ fontSize: 20 }}>Items: <strong>{formatKES(total)}</strong></p>
          <div className="banner">
            <p>Please sign in so we can keep your order safe and let you follow it.</p>
            <Link className="btn" to="/account?next=/cart">Sign in or sign up</Link>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="formcol">
          <h3>Your details</h3>
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Phone (for WhatsApp)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
          <TextField label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />

          <fieldset className="dlv">
            <legend>Delivery</legend>
            {DELIVERY.map((d) => (
              <label className="dopt" key={d.code}>
                <input type="radio" name="delivery" checked={method === d.code} onChange={() => setMethod(d.code)} />
                <span>
                  <b>{d.label} {d.feeKes === 0 ? '(free)' : d.feeKes == null ? '(cost confirmed later)' : '(' + formatKES(d.feeKes) + ')'}</b>
                  <small>{d.note}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {del.needsAddress ? <TextField label="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Building, street, area, town" /> : null}
          <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div>
            <div className="sumrow"><span>Items</span><span>{formatKES(total)}</span></div>
            <div className="sumrow"><span>Delivery</span><span>{fee == null ? 'Confirmed on WhatsApp' : fee === 0 ? 'Free' : formatKES(fee)}</span></div>
            <div className="sumrow" style={{ fontSize: 18 }}><strong>Total</strong><strong>{formatKES(grand)}{fee == null ? ' + delivery' : ''}</strong></div>
          </div>

          {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place order'}</button>
        </form>
      )}
    </div>
  );
}
