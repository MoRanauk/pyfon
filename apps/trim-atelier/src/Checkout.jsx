import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './jx.css';
import { formatKES } from '@pyfon/ui';
import { api, STORE, API_URL, tokens } from './api.js';
import { useCart, useAuth } from './store.jsx';
import { DELIVERY } from './delivery.js';
import { errText, normPhone } from './lib.js';
import { Acc, getShip, setShipPref } from './Bits.jsx';
import PayPanel from './PayPanel.jsx';

async function previewCoupon(code, itemsKes) {
  const t = await tokens.get();
  const r = await fetch(API_URL + '/v1/customer/coupons/check', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Interface': STORE, Authorization: 'Bearer ' + t }, body: JSON.stringify({ code, itemsKes }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 429 ? 'Too many tries. Please wait a few minutes.' : (j.error && j.error.message) || 'Could not check the coupon.');
  return j;
}

const SLOTS = ['Morning (8am to 12pm)', 'Afternoon (12pm to 4pm)', 'Evening (4pm to 7pm)'];

function Fld({ f, up, label, k, ...p }) {
  return <label className="jx-lab"><small>{label}</small><input className="jx-in" value={f[k]} onChange={up(k)} {...p} /></label>;
}

export default function Checkout() {
  const { lines, clear, total } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const gift = STORE === 'prestige';
  const [f, setF] = useState({ name: '', phone: '', email: '', rName: '', rPhone: '', address: '', date: '', slot: SLOTS[0], msg: '', from: '', notes: '' });
  const [surprise, setSurprise] = useState(false);
  const [m, setM] = useState(getShip());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [cp, setCp] = useState('');
  const [applied, setApplied] = useState(null);
  const [cpMsg, setCpMsg] = useState('');
  const up = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  useEffect(() => { if (user) setF((s) => ({ ...s, email: s.email || user.email || '', name: s.name || user.fullName || user.full_name || '' })); }, [user]);

  const fresh = lines.some((l) => l.fresh);
  const options = DELIVERY.filter((d) => !(fresh && d.code === 'courier'));
  const del = options.find((d) => d.code === m) || options[0];
  const fee = del.feeKes;
  const disc = applied ? Math.min(applied.discountKes, total) : 0;
  const today = new Date().toISOString().slice(0, 10);

  async function applyCoupon() {
    setCpMsg('');
    if (!user) { setApplied(null); return setCpMsg('Sign in first, then apply your code.'); }
    try { setApplied(await previewCoupon(cp, total)); } catch (ex) { setApplied(null); setCpMsg(ex.message); }
  }

  async function submit(e) {
    e.preventDefault(); setErr('');
    if (!user) return nav('/account?next=/checkout');
    const ph = normPhone(f.phone);
    if (f.name.trim().length < 2) return setErr('Enter your name.');
    if (!ph) return setErr('Enter a valid phone number, like 0712345678.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address.');
    if (gift && f.rName.trim().length < 2) return setErr('Who is the gift for? Enter the recipient name.');
    if (gift && !f.date) return setErr('Choose the delivery or pickup date.');
    if (del.needsAddress && f.address.trim().length < 5) return setErr('Enter the delivery address.');
    const notes = (gift ? ['GIFT FOR ' + f.rName.trim() + (f.rPhone ? ' (' + f.rPhone.trim() + ')' : ''),
      'Date: ' + f.date + ', ' + f.slot, f.msg ? 'Card message: ' + f.msg.trim().slice(0, 200) : '',
      f.from ? 'From: ' + f.from.trim().slice(0, 40) : '', surprise ? 'SURPRISE: do not call the recipient before delivery' : '']
      : []).concat(f.notes ? ['Notes: ' + f.notes.trim().slice(0, 100)] : []).filter(Boolean).join('. ').slice(0, 500);
    setBusy(true);
    try {
      const body = {
        contactName: f.name.trim(), contactPhone: ph, contactEmail: f.email.trim(), deliveryMethod: del.code, deliveryNotes: notes, couponCode: applied ? applied.code : undefined,
        lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, options: l.options || {}, personalization: l.text ? { text: l.text } : {} })),
      };
      if (del.needsAddress) body.deliveryAddress = f.address.trim();
      const d = await api.customer.createOrder(body);
      setDone({ order: d.order, url: d.whatsappUrl }); clear();
    } catch (ex) { setErr(errText(ex)); }
    setBusy(false);
  }

  if (done) {
    const o = done.order || {};
    return (
      <div className="jx" style={{ textAlign: 'center' }}>
        <h1>Thank you! Your order is received</h1>
        {o.ref ? <p>Your order reference is <b>{o.ref}</b>.</p> : null}
        {o.discountKes ? <p>Coupon {o.couponCode} saved you {formatKES(o.discountKes)}.</p> : null}
        <h2>Pay now</h2>
        {o.ref ? <PayPanel orderRef={o.ref} iface={STORE} startOpen /> : null}
        <p>Prefer to pay later? You can pay any time from My orders. We will message you on WhatsApp about delivery.</p>
        <p><a className="jx-btn" href={done.url} target="_blank" rel="noreferrer">Message us on WhatsApp</a></p>
        <p><Link to="/orders">Track my order</Link></p><p><Link to="/shop">Keep shopping</Link></p>
      </div>
    );
  }
  if (!lines.length) return <div className="jx"><h1>Checkout</h1><p>Your cart is empty.</p><Link to="/shop">Browse the shop</Link></div>;

  return (
    <div className="jx jx-pale" style={{ maxWidth: 'none' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h1>Checkout</h1>
        <div className="jx-two">
          <div>
            <div className="jx-acc">
              <Acc title="Returning customer? Click here to login">{user ? <p>You are signed in as {user.email}.</p> : <p><Link to="/account?next=/checkout">Sign in or sign up</Link></p>}</Acc>
              <Acc title="Have a coupon? Click here to enter your code"><div style={{ display: 'flex', gap: 8 }}><input className="jx-in" value={cp} onChange={(e) => setCp(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" /><button type="button" className="jx-btn" onClick={applyCoupon}>Apply</button></div>{applied ? <p>Coupon <b>{applied.code}</b> applied. You save {formatKES(applied.discountKes)}.</p> : null}{cpMsg ? <p className="err" role="alert">{cpMsg}</p> : null}</Acc>
            </div>
            <h2 style={{ marginTop: 44 }}>Billing details</h2>
            <form id="co" onSubmit={submit}>
              <Fld f={f} up={up} label="Full name *" k="name" />
              <Fld f={f} up={up} label="Phone (WhatsApp) *" k="phone" placeholder="0712345678" />
              <Fld f={f} up={up} label="Email address *" k="email" type="email" />
              {gift ? (
                <>
                  <h2 style={{ marginTop: 36 }}>Who is it for?</h2>
                  <Fld f={f} up={up} label="Recipient name *" k="rName" />
                  <Fld f={f} up={up} label="Recipient phone (optional)" k="rPhone" />
                  <Fld f={f} up={up} label="Card message (optional, up to 200 characters)" k="msg" maxLength={200} />
                  <Fld f={f} up={up} label="From (leave empty to stay anonymous)" k="from" maxLength={40} />
                  <label className="ad"><input type="checkbox" checked={surprise} onChange={(e) => setSurprise(e.target.checked)} /><span>It is a surprise: do not call the recipient before delivery</span></label>
                  <Fld f={f} up={up} label="Date *" k="date" type="date" min={today} />
                  <label className="jx-lab"><small>Time</small><select className="jx-in" value={f.slot} onChange={up('slot')}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select></label>
                </>
              ) : null}
              {del.needsAddress ? <Fld f={f} up={up} label="Delivery address *" k="address" placeholder="Building, street, area, town" /> : null}
              <Fld f={f} up={up} label="Order notes (optional)" k="notes" maxLength={100} placeholder="Notes about your order" />
            </form>
          </div>
          <div>
            <table className="jx-tot"><tbody>
              <tr><th>Product</th><th style={{ width: 'auto' }}>Subtotal</th></tr>
              {lines.map((l) => <tr key={l.key}><td>{l.name} x {l.qty}</td><td>{formatKES(l.priceKes * l.qty)}</td></tr>)}
              <tr><th>Subtotal</th><td>{formatKES(total)}</td></tr>
              <tr><th>Shipment</th><td>{options.map((d) => (
                <label className="jx-rad" key={d.code}><input type="radio" name="ship" checked={del.code === d.code} onChange={() => { setM(d.code); setShipPref(d.code); }} /> {d.label}: <b>{d.feeKes === 0 ? 'Free' : d.feeKes == null ? 'confirmed later' : formatKES(d.feeKes)}</b></label>
              ))}</td></tr>
              {disc ? <tr><th>Coupon</th><td>-{formatKES(disc)}</td></tr> : null}
              <tr><th>Total</th><td><b>{formatKES(total - disc + (fee || 0))}</b>{fee == null ? ' + delivery' : ''}</td></tr>
            </tbody></table>
            <div className="jx-box">
              <p><b>Pay with M-Pesa after you place your order</b></p>
              <p className="muted" style={{ fontSize: 14 }}>Place your order, then pay to our till on the next screen. You do not need to type anything. The team confirms your payment and messages you.</p>
              {err ? <p className="err" role="alert">{err}</p> : null}
              <button className="jx-bar" form="co" type="submit" disabled={busy}>{busy ? 'Saving...' : user ? 'Place order' : 'Sign in to place order'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
