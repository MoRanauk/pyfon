import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatKES } from '@pyfon/ui';
import { api, img } from './api.js';
import { useCart, useAuth } from './store.jsx';
import { DELIVERY } from './delivery.js';
import { errText, normPhone } from './lib.js';

const SLOTS = ['Morning (8am to 12pm)', 'Afternoon (12pm to 4pm)', 'Evening (4pm to 7pm)'];

export default function Cart() {
  const { lines, setQty, remove, clear, total } = useCart();
  const { user } = useAuth();
  const [f, setF] = useState({ name: '', phone: '', email: '', rName: '', rPhone: '', address: '', method: 'nairobi', date: '', slot: SLOTS[0], msg: '', from: '', notes: '' });
  const [surprise, setSurprise] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const up = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  useEffect(() => { if (user) setF((s) => ({ ...s, email: s.email || user.email || '', name: s.name || user.fullName || user.full_name || '' })); }, [user]);

  const fresh = lines.some((l) => l.fresh);
  const options = DELIVERY.filter((d) => !(fresh && d.code === 'courier'));
  const del = options.find((d) => d.code === f.method) || options[0];
  const fee = del.feeKes;
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e) {
    e.preventDefault(); setErr('');
    const ph = normPhone(f.phone);
    if (f.name.trim().length < 2) return setErr('Enter your name.');
    if (!ph) return setErr('Enter a valid phone number, like 0712345678.');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email address.');
    if (f.rName.trim().length < 2) return setErr('Who is the gift for? Enter the recipient name.');
    if (!f.date) return setErr('Choose the delivery or pickup date.');
    if (del.needsAddress && f.address.trim().length < 5) return setErr('Enter the delivery address.');
    const notes = ['GIFT FOR ' + f.rName.trim() + (f.rPhone ? ' (' + f.rPhone.trim() + ')' : ''),
      'Date: ' + f.date + ', ' + f.slot, f.msg ? 'Card message: ' + f.msg.trim().slice(0, 200) : '',
      f.from ? 'From: ' + f.from.trim().slice(0, 40) : '', surprise ? 'SURPRISE: do not call the recipient before delivery' : '',
      f.notes ? 'Notes: ' + f.notes.trim().slice(0, 100) : ''].filter(Boolean).join('. ').slice(0, 500);
    setBusy(true);
    try {
      const body = {
        contactName: f.name.trim(), contactPhone: ph, contactEmail: f.email.trim(), deliveryMethod: del.code, deliveryNotes: notes,
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
      <div className="wrap sec center">
        <h1>Thank you! Your gift order is received</h1>
        {o.ref ? <p>Your order reference is <b>{o.ref}</b>.</p> : null}
        <p>We will confirm payment and delivery with you on WhatsApp.</p>
        <p><a className="btn" href={done.url} target="_blank" rel="noreferrer">Message us on WhatsApp</a></p>
        <p><Link to="/shop">Keep shopping</Link></p>
      </div>
    );
  }
  if (!lines.length) return <div className="wrap sec center"><h1>Your cart is empty</h1><Link to="/shop">Browse gifts</Link></div>;

  return (
    <div className="wrap sec">
      <h1>Your cart</h1>
      {lines.map((l) => (
        <div className="cl" key={l.key}>
          <img src={img(l.image)} alt="" />
          <div style={{ flex: 1 }}><b>{l.name}</b>
            <div className="muted">{Object.entries(l.options || {}).map(([k, v]) => k + ': ' + v).join(', ')}{l.text ? ' \u00b7 Text: ' + l.text : ''}</div>
            <div className="muted">{formatKES(l.priceKes)} each</div></div>
          <input className="in" type="number" min={l.minOrderQty || 1} value={l.qty} onChange={(e) => setQty(l.key, parseInt(e.target.value, 10))} aria-label="Quantity" />
          <b>{formatKES(l.priceKes * l.qty)}</b>
          <button type="button" className="chip" onClick={() => remove(l.key)}>Remove</button>
        </div>
      ))}
      {!user ? (
        <div className="box"><p>Items: <b>{formatKES(total)}</b></p><p>Please sign in so we can keep your order safe.</p><Link className="btn" to="/account?next=/cart">Sign in or sign up</Link></div>
      ) : (
        <form className="form" onSubmit={submit}>
          <h2>About you</h2>
          <label className="fld"><span>Your name</span><input className="in" value={f.name} onChange={up('name')} /></label>
          <label className="fld"><span>Your phone (WhatsApp)</span><input className="in" value={f.phone} onChange={up('phone')} placeholder="0712345678" /></label>
          <label className="fld"><span>Email</span><input className="in" type="email" value={f.email} onChange={up('email')} /></label>
          <h2>Who is it for?</h2>
          <label className="fld"><span>Recipient name</span><input className="in" value={f.rName} onChange={up('rName')} /></label>
          <label className="fld"><span>Recipient phone (optional)</span><input className="in" value={f.rPhone} onChange={up('rPhone')} /></label>
          <label className="fld"><span>Card message (optional, up to 200 characters)</span><textarea className="in" rows={3} maxLength={200} value={f.msg} onChange={up('msg')} /></label>
          <label className="fld"><span>From (leave empty to stay anonymous)</span><input className="in" maxLength={40} value={f.from} onChange={up('from')} /></label>
          <label className="ad"><input type="checkbox" checked={surprise} onChange={(e) => setSurprise(e.target.checked)} /><span>It is a surprise: do not call the recipient before delivery</span></label>
          <h2>Delivery</h2>
          {fresh ? <p className="muted">Your cart has fresh items, so we deliver in Nairobi only.</p> : null}
          {options.map((d) => (
            <label className="dopt" key={d.code}><input type="radio" name="d" checked={del.code === d.code} onChange={() => setF((s) => ({ ...s, method: d.code }))} />
              <span><b>{d.label} {d.feeKes === 0 ? '(free)' : d.feeKes == null ? '(cost confirmed later)' : '(' + formatKES(d.feeKes) + ')'}</b><small>{d.note}</small></span></label>
          ))}
          {del.needsAddress ? <label className="fld"><span>Delivery address</span><input className="in" value={f.address} onChange={up('address')} placeholder="Building, street, area, town" /></label> : null}
          <label className="fld"><span>Date</span><input className="in" type="date" min={today} value={f.date} onChange={up('date')} /></label>
          <label className="fld"><span>Time</span><select className="in" value={f.slot} onChange={up('slot')}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="fld"><span>Other notes (optional)</span><input className="in" maxLength={100} value={f.notes} onChange={up('notes')} /></label>
          <div className="box">
            <div className="sum"><span>Items</span><span>{formatKES(total)}</span></div>
            <div className="sum"><span>Delivery</span><span>{fee == null ? 'Confirmed on WhatsApp' : fee === 0 ? 'Free' : formatKES(fee)}</span></div>
            <div className="sum"><b>Total</b><b>{formatKES(total + (fee || 0))}{fee == null ? ' + delivery' : ''}</b></div>
          </div>
          {err ? <p className="err" role="alert">{err}</p> : null}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Place order'}</button>
        </form>
      )}
    </div>
  );
}
