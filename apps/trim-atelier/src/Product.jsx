import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, img, STORE } from './api.js';
import { SITE } from './site.js';
import { useCart, useCatalog } from './store.jsx';
import { isAddon, optionGroups, priceText, tagVals } from './lib.js';
import { formatKES } from '@pyfon/ui';

export default function Product() {
  const { sku } = useParams();
  const { items } = useCatalog();
  const { add } = useCart();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState('');
  const [sel, setSel] = useState({});
  const [main, setMain] = useState('');
  const [qty, setQty] = useState(1);
  const [text, setText] = useState('');
  const [extra, setExtra] = useState([]);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setItem(null); setErr(''); setOk(false); setExtra([]); setText('');
    api.catalog.item(STORE, sku).then((d) => {
      setItem(d.item); setMain(d.item.image); setQty(d.item.minOrderQty || 1);
      setSel(Object.fromEntries(optionGroups(d.item.options).map((g) => [g.name, g.values[0]])));
    }).catch((e) => setErr(e.message));
  }, [sku]);
  if (err) return <div className="wrap sec"><p className="err">{err}</p><Link to="/shop">Back to the shop</Link></div>;
  if (!item) return <div className="wrap sec"><p className="muted">Loading...</p></div>;

  const addons = items.filter(isAddon);
  const pers = (item.personalization || []).filter((p) => p !== 'none');
  const canOrder = item.type === 'product' && item.priceType === 'fixed' && item.priceKes != null && item.stockStatus !== 'out_of_stock';
  const fresh = tagVals(item, 'delivery').includes('nairobi');
  const min = item.minOrderQty || 1;
  const toggle = (s) => setExtra(extra.includes(s) ? extra.filter((x) => x !== s) : [...extra, s]);
  function addToCart() {
    add(item, Math.max(min, parseInt(qty, 10) || min), pers.includes('text') ? text.trim() : '', sel);
    extra.forEach((s) => { const a = addons.find((x) => x.sku === s); if (a) add(a, 1, '', {}); });
    setOk(true);
  }
  return (
    <div className="wrap sec">
      <p className="muted"><Link to="/shop">Shop</Link> / {item.category}</p>
      <div className="pdp">
        <div>
          <div className="main"><img src={img(main || item.image)} alt={item.name} /></div>
          {item.images && item.images.length > 1 ? <div className="thumbs">{item.images.map((p) => <img key={p} src={img(p)} alt="" className={p === main ? 'on' : ''} onClick={() => setMain(p)} />)}</div> : null}
        </div>
        <div>
          <h1>{item.name}</h1>
          <div className="price">{priceText(item)}</div>
          <p>{item.description}</p>
          {fresh ? <p className="muted">Fresh item: Nairobi delivery only. You choose the date at checkout.</p> : null}
          {optionGroups(item.options).map((g) => (
            <div className="fld" key={g.name}><span>{g.name}: <b>{sel[g.name]}</b></span>
              {g.values.map((v) => <button key={v} type="button" className={'chip' + (sel[g.name] === v ? ' on' : '')} style={{ marginRight: 6 }} onClick={() => setSel({ ...sel, [g.name]: v })}>{v}</button>)}
            </div>
          ))}
          {canOrder ? (
            <>
              {pers.includes('text') ? <label className="fld"><span>Name or text to print (optional)</span><input className="in" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="A name, a date or a short message" /></label> : null}
              {pers.some((p) => p === 'logo' || p === 'photo') ? <p className="muted">To use a logo or photo, send it to us on WhatsApp after you order.</p> : null}
              {addons.length ? (
                <div className="fld"><span><b>Make it special</b></span>
                  {addons.map((a) => (
                    <label className="ad" key={a.sku}><input type="checkbox" checked={extra.includes(a.sku)} onChange={() => toggle(a.sku)} />
                      <span style={{ flex: 1 }}>{a.name}</span><b>+ {formatKES(a.priceKes)}</b></label>
                  ))}
                </div>
              ) : null}
              <label className="fld"><span>Quantity</span><input className="in" style={{ width: 90 }} type="number" min={min} value={qty} onChange={(e) => setQty(e.target.value)} /></label>
              <button type="button" className="btn" onClick={addToCart}>Add to cart</button>
              {ok ? <p>Added. <Link to="/cart"><b>View cart</b></Link> or <Link to="/shop">keep shopping</Link>.</p> : null}
            </>
          ) : (
            <a className="btn" target="_blank" rel="noreferrer" href={'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent('Hello, I would like a quote for ' + item.name + ' (' + item.sku + ').')}>Ask us on WhatsApp</a>
          )}
        </div>
      </div>
    </div>
  );
}
