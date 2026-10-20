import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './jx.css';
import { formatKES } from '@pyfon/ui';
import { img } from './api.js';
import { useCart, useCatalog } from './store.jsx';
import { DELIVERY } from './delivery.js';
import { isAddon, priceText } from './lib.js';
import { getShip, setShipPref } from './Bits.jsx';

export default function Cart() {
  const { lines, setQty, remove, total } = useCart();
  const { items } = useCatalog();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [m, setM] = useState(getShip());
  const fresh = lines.some((l) => l.fresh);
  const options = DELIVERY.filter((d) => !(fresh && d.code === 'courier'));
  const del = options.find((d) => d.code === m) || options[0];
  const fee = del.feeKes;
  const pick = (c) => { setM(c); setShipPref(c); };
  const best = items.filter((i) => !isAddon(i) && i.type === 'product' && i.priceKes != null).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 2);

  if (!lines.length) return <div className="jx"><h1>Cart</h1><p>Your cart is empty.</p><Link to="/shop">Browse the shop</Link></div>;
  return (
    <div className="jx jx-pale" style={{ maxWidth: 'none' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h1>Cart</h1>
        <table className="jx-tbl">
          <thead><tr><th /><th /><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td><button type="button" className="jx-x" aria-label="Remove" onClick={() => remove(l.key)}>&times;</button></td>
                <td><img src={img(l.image)} alt="" /></td>
                <td>{l.name}<div className="muted" style={{ fontSize: 13 }}>{Object.entries(l.options || {}).map(([k, v]) => k + ': ' + v).join(', ')}{l.text ? ' \u00b7 Text: ' + l.text : ''}</div></td>
                <td>{formatKES(l.priceKes)}</td>
                <td><input className="jx-q" type="number" min={l.minOrderQty || 1} value={l.qty} onChange={(e) => setQty(l.key, parseInt(e.target.value, 10))} aria-label="Quantity" /></td>
                <td>{formatKES(l.priceKes * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="jx-row">
          <input className="jx-in" style={{ maxWidth: 260 }} placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="button" className="jx-btn" onClick={() => setMsg('Coupon codes are not switched on yet.')}>Apply coupon</button>
          {msg ? <span className="muted">{msg}</span> : null}
        </div>
        <div className="jx-two" style={{ marginTop: 40 }}>
          <div>
            <h2>Best Selling Products</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              {best.map((i) => (
                <Link key={i.sku} to={'/p/' + i.sku} className="jx-card">
                  <img src={img(i.image)} alt="" /><div>{i.name}</div><hr className="jx-rule" style={{ margin: '10px 0' }} /><div className="pr"><span>{priceText(i)}</span></div>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2>Cart totals</h2>
            <table className="jx-tot"><tbody>
              <tr><th>Subtotal</th><td>{formatKES(total)}</td></tr>
              <tr><th>Shipment</th><td>{options.map((d) => (
                <label className="jx-rad" key={d.code}><input type="radio" name="ship" checked={del.code === d.code} onChange={() => pick(d.code)} /> {d.label}: <b>{d.feeKes === 0 ? 'Free' : d.feeKes == null ? 'confirmed later' : formatKES(d.feeKes)}</b></label>
              ))}</td></tr>
              <tr><th>Total</th><td><b>{formatKES(total + (fee || 0))}</b>{fee == null ? ' + delivery' : ''}</td></tr>
            </tbody></table>
            <p style={{ textAlign: 'right' }}><button type="button" className="jx-btn" onClick={() => nav('/checkout')}>Proceed to checkout</button></p>
          </div>
        </div>
      </div>
    </div>
  );
}
