import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, img, STORE } from './api.js';
import { useCart } from './CartState.jsx';
import { useCatalog } from './CatalogState.jsx';
import { Card, Rail } from './Shared.jsx';
import { buildGroups, mix, priceText } from './groups.js';

const STOCK = { in_stock: 'In stock', made_to_order: 'Made to order', out_of_stock: 'Out of stock' };

// Turns the item's options into [{ name, values: [] }]. Accepts the shapes the importer may store.
function optionGroups(options) {
  if (!options) return [];
  let out = [];
  if (Array.isArray(options)) {
    out = options.map((o) => {
      if (typeof o === 'string') {
        const [n, v] = o.split(':');
        return { name: (n || '').trim(), values: (v || '').split('|').map((x) => x.trim()) };
      }
      return { name: o.name || o.group || o.label || '', values: (o.values || o.options || []).map(String) };
    });
  } else if (typeof options === 'object') {
    out = Object.entries(options).map(([name, v]) => ({ name, values: Array.isArray(v) ? v.map(String) : [] }));
  }
  return out.filter((g) => g.name && g.values.length);
}

export default function Product() {
  const { sku } = useParams();
  const { all, cats } = useCatalog();
  const { add } = useCart();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [main, setMain] = useState('');
  const [sel, setSel] = useState({});
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [qty, setQty] = useState(1);
  const [text, setText] = useState('');
  const [toast, setToast] = useState(false);

  useEffect(() => {
    setItem(null);
    setError('');
    setToast(false);
    setText('');
    setZoom(false);
    window.scrollTo(0, 0);
    api.catalog.item(STORE, sku).then((d) => {
      setItem(d.item);
      setSel(Object.fromEntries(optionGroups(d.item.options).map((g) => [g.name, g.values[0]])));
      setQty(d.item.minOrderQty || 1);
    }).catch((e) => setError(e.message));
  }, [sku]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(false), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const opts = useMemo(() => (item ? optionGroups(item.options) : []), [item]);
  // Photos of the chosen options come first, then the product's own photos.
  const gallery = useMemo(() => {
    if (!item) return [];
    const base = item.images && item.images.length ? item.images : [item.image];
    const extra = [];
    for (const g of opts) {
      const l = item.optionImages && item.optionImages[g.name] && item.optionImages[g.name][sel[g.name]];
      if (l) extra.push(...l);
    }
    return [...new Set([...extra, ...base])];
  }, [item, opts, sel]);
  const gkey = gallery.join('|');
  useEffect(() => { setMain(gallery[0] || ''); setZoom(false); }, [gkey]); // eslint-disable-line

  const more = useMemo(
    () => (item ? all.filter((i) => i.categorySlug === item.categorySlug && i.sku !== item.sku).slice(0, 10) : []),
    [all, item]
  );
  const others = useMemo(
    () => (item ? mix(all.filter((i) => i.categorySlug !== item.categorySlug && i.type === 'product' && i.image), 10) : []),
    [all, item]
  );
  const groups = useMemo(() => buildGroups(cats), [cats]);

  if (error) return <div className="wrap section"><p role="alert">{error}</p><Link to="/shop">Back to shop</Link></div>;
  if (!item) return <div className="wrap section"><p className="muted">Loading...</p></div>;

  const quote = item.priceType === 'quote' || item.priceKes == null;
  const pers = (item.personalization || []).filter((p) => p !== 'none');
  const canOrder = item.type === 'product' && item.priceType === 'fixed' && item.priceKes != null && item.stockStatus !== 'out_of_stock';
  const min = item.minOrderQty || 1;
  const shown = main || gallery[0] || item.image;
  const chosen = opts.map((g) => g.name + ': ' + sel[g.name]).join(', ');

  const feats = (item.description || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (pers.length) feats.push('Personalise with: ' + pers.join(', ') + '.');
  if (min > 1) feats.push('Minimum order: ' + min + '.');
  feats.push('Every job is checked by our partners before dispatch.');

  function addToCart() {
    
    add(item, Math.max(min, parseInt(qty, 10) || min), pers.includes('text') ? text.trim() : '', sel);
    setToast(true);
  }

  function move(e) {
    if (!zoom) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%');
  }

  return (
    <div className="wrap section">
      <p className="muted"><Link to="/shop">Shop</Link> / <Link to={'/shop?category=' + item.categorySlug}>{item.category}</Link></p>

      <div className="pdp">
        <div>
          <div className="gal">
            {gallery.length > 1 ? (
              <div className="thumbs">
                {gallery.map((p) => (
                  <img key={p} src={img(p)} alt="" className={p === shown ? 'on' : ''} onClick={() => setMain(p)} />
                ))}
              </div>
            ) : null}
            <div className={'mainimg' + (zoom ? ' z' : '')} onDoubleClick={() => setZoom(!zoom)} onMouseMove={move} onMouseLeave={() => setZoom(false)}>
              <img src={img(shown)} alt={item.name} style={{ transform: zoom ? 'scale(2.2)' : 'none', transformOrigin: origin }} />
            </div>
          </div>
          <p className="zhint">Double-click the photo to zoom.</p>
        </div>

        <div className="pinfo">
          <h1>{item.name}</h1>
          <p className="sold">Made to order by Pyfon Brands</p>
          <p className="pprice">
            {priceText(item)}
            {item.compareAtPriceKes != null && !quote ? (
              <span className="muted" style={{ marginLeft: 12, fontSize: 18, fontWeight: 400, textDecoration: 'line-through' }}>
                {'KES ' + Number(item.compareAtPriceKes).toLocaleString('en-KE')}
              </span>
            ) : null}
          </p>
          <span className="badge">{STOCK[item.stockStatus] || item.stockStatus}{item.leadTimeDays ? ' \u00b7 about ' + item.leadTimeDays + ' days' : ''}</span>

          {opts.map((g) => (
            <div className="field" key={g.name}>
              <span>{g.name}: <b>{sel[g.name]}</b></span>
              <div className="opts">
                {g.values.map((v) => (
                  <button key={v} type="button" className={'opt' + (sel[g.name] === v ? ' on' : '')} onClick={() => setSel({ ...sel, [g.name]: v })}>{v}</button>
                ))}
              </div>
            </div>
          ))}

          {canOrder ? (
            <>
              {pers.includes('text') ? (
                <label className="field">Text to print (optional)
                  <input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="A name, a quote or a short message" />
                </label>
              ) : null}
              <div className="field">Quantity
                <div className="qty">
                  <button type="button" aria-label="Less" onClick={() => setQty(Math.max(min, (parseInt(qty, 10) || min) - 1))}>-</button>
                  <input type="number" min={min} value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Quantity" />
                  <button type="button" aria-label="More" onClick={() => setQty((parseInt(qty, 10) || min) + 1)}>+</button>
                </div>
              </div>
              <button type="button" className="addbtn" onClick={addToCart}>Add to cart</button>
              {pers.some((p) => p === 'logo' || p === 'photo') ? <p className="muted" style={{ marginTop: 0 }}>To use a logo or photo, send it to us on WhatsApp after you order.</p> : null}
            </>
          ) : (
            <Link className="addbtn" to={'/quote?sku=' + item.sku} style={{ marginTop: 24 }}>Request a quote</Link>
          )}

          <div className="pbox">
            <span aria-hidden="true">&#128666;</span>
            <div>
              <strong>Delivery</strong>
              We confirm price, payment and delivery date with you on WhatsApp after you order.
            </div>
          </div>
          <div className="pbox">
            <span aria-hidden="true">&#128172;</span>
            <div>
              <strong>Support</strong>
              Questions about your design? Talk to a real person.
            </div>
          </div>

          <div className="feat">
            <h3>Product features</h3>
            <ul>{feats.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        </div>
      </div>

      {more.length ? (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontFamily: 'var(--pf-font-heading)' }}>More in {item.category}</h2>
          <Rail>{more.map((it) => <Card key={it.sku} it={it} />)}</Rail>
        </div>
      ) : null}

      {others.length ? (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontFamily: 'var(--pf-font-heading)' }}>You might also like</h2>
          <Rail>{others.map((it) => <Card key={it.sku} it={it} />)}</Rail>
        </div>
      ) : null}

      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 8px' }}>Looking for something different?</h3>
        <div className="chips">
          {groups.map((g) => <Link key={g.key} className="chip" to={'/c/' + g.key}>{g.title}</Link>)}
        </div>
      </div>

      {toast ? (
        <div className="toast" role="status">
          <span>Added to cart</span>
          <Link to="/cart">View cart</Link>
        </div>
      ) : null}
    </div>
  );
}

