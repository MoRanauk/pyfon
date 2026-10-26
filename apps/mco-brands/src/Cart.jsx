import { useEffect, useState } from 'react';
import PhoneField, { phoneOk, phoneForServer, emailOk } from './PhoneField.jsx';
import { Link } from 'react-router-dom';
import { formatKES, TextField } from '@pyfon/ui';
import { api, img, API_URL, STORE, tokens } from './api.js';
import { useCart } from './CartState.jsx';
import { useAuth } from './AuthState.jsx';
import { DELIVERY } from './delivery.js';
import { errText } from './util.js';
import PayPanel from './PayPanel.jsx';

const PHONE = /^\+?[0-9 ]{9,15}$/;

async function previewCoupon(code, itemsKes) {
  const t = await tokens.get();
  const r = await fetch(API_URL + '/v1/customer/coupons/check', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interface': STORE, Authorization: 'Bearer ' + t }, body: JSON.stringify({ code, itemsKes }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 429 ? 'Too many tries. Please wait a few minutes.' : (j.error && j.error.message) || 'Could not check the coupon.');
  return j;
}

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
  const [cp, setCp] = useState('');
  const [applied, setApplied] = useState(null);
  const [cpMsg, setCpMsg] = useState('');
  useEffect(() => { if (user) { setEmail((v) => v || user.email || ''); setName((v) => v || user.fullName || user.full_name || ''); } }, [user]);

  const del = DELIVERY.find((d) => d.code === method) || DELIVERY[0];
  const fee = del.feeKes;
  const disc = applied ? Math.min(applied.discountKes, total) : 0;
  const grand = total - disc + (fee || 0);

  async function applyCoupon() {
    setCpMsg('');
    try { setApplied(await previewCoupon(cp, total)); } catch (ex) { setApplied(null); setCpMsg(ex.message); }
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (name.trim().length < 2) return setErr('Enter your name.');
    if (!phoneOk(phone)) return setErr('Choose your country and enter a valid phone number.');
    if (!emailOk(email)) return setErr('Enter a valid email address.');
    if (del.needsAddress && address.trim().length < 5) return setErr('Enter your delivery address.');
    setBusy(true);
    try {
      const body = {
        contactName: name.trim(),
        contactPhone: phoneForServer(phone),
        deliveryMethod: method,
        couponCode: applied ? applied.code : undefined,
        lines: lines.map((l) => ({
          sku: l.sku,
          qty: l.qty,
          options: l.options || {},
          personalization: l.text ? { text: l.text } : {},
          designId: l.design ? l.design.id : undefined
        }))
      };
      body.contactEmail = email.trim();
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
        <h2>Thank you! Your order is received</h2>
        {o.ref ? <p>Your order reference is <strong>{o.ref}</strong>.</p> : null}
        {o.discountKes ? <p>Coupon {o.couponCode} saved you {formatKES(o.discountKes)}. Your total is {o.totalKes != null ? formatKES(o.totalKes) : 'shown on WhatsApp'}.</p> : null}
        {o.totalKes != null ? (
          <p>
            Items {formatKES(o.itemsKes)} + delivery {o.deliveryFeeKes == null ? 'to be confirmed' : formatKES(o.deliveryFeeKes)}
            {o.deliveryFeeKes == null ? '' : ' = ' + formatKES(o.totalKes)}.
          </p>
        ) : null}
        <p><b>Please note: your order will be ready after 24 hours.</b></p>
        <h3>Pay now</h3>
        {o.ref ? <PayPanel orderRef={o.ref} iface={STORE} startOpen /> : null}
        <p>You can also pay later from My orders, and follow every stage of your order there.</p>
        <a className="btn" href="/orders">Track my order</a>
        <p><a className="linkbtn" href={done.url} target="_blank" rel="noreferrer">Message us on WhatsApp</a></p>
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
          <PhoneField label="Phone (for WhatsApp)" onChange={setPhone} />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

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
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={cp} onChange={(e) => setCp(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} placeholder="Coupon code" aria-label="Coupon code" style={{ flex: 1 }} />
              <button type="button" className="btn" onClick={applyCoupon}>Apply</button>
            </div>
            {applied ? <p>Coupon <strong>{applied.code}</strong> applied. You save {formatKES(applied.discountKes)}.</p> : null}
            {cpMsg ? <p role="alert" style={{ color: '#b00020' }}>{cpMsg}</p> : null}
          </div>

          <div>
            <div className="sumrow"><span>Items</span><span>{formatKES(total)}</span></div>
            {disc ? <div className="sumrow"><span>Coupon</span><span>-{formatKES(disc)}</span></div> : null}
            <div className="sumrow"><span>Delivery</span><span>{fee == null ? 'Confirmed on WhatsApp' : fee === 0 ? 'Free' : formatKES(fee)}</span></div>
            <div className="sumrow" style={{ fontSize: 18 }}><strong>Total</strong><strong>{formatKES(grand)}{fee == null ? ' + delivery' : ''}</strong></div>
          </div>

          {err ? <p role="alert" style={{ color: '#b00020' }}>{err}</p> : null}
          <p className="muted"><b>Please note: your order will be ready after 24 hours.</b></p>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place order'}</button>
        </form>
      )}
    </div>
  );
}
