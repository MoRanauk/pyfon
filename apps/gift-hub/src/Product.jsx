import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReviewsSection } from '@pyfon/ui';
import { API_URL, tokens } from './api.js';
import './jx.css';
import { api, img, STORE } from './api.js';
import * as S from './site.js';
import { useCart, useCatalog } from './store.jsx';
import { DELIVERY } from './delivery.js';
import { isAddon, optionGroups, priceText, tagVals } from './lib.js';
import { formatKES } from '@pyfon/ui';
import { Acc, Rail, Zoom, videoOf } from './Bits.jsx';

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
  if (err) return <div className="jx"><p className="err">{err}</p><Link to="/shop">Back to the shop</Link></div>;
  if (!item) return <div className="jx"><p className="muted">Loading...</p></div>;

  const SITE = S.SITE || {};
  const sw = S.SWATCH || {};
  const groups = optionGroups(item.options);
  const oi = item.optionImages || {};
  let pics = item.images || [];
  groups.forEach((g) => { const v = oi[g.name] && oi[g.name][sel[g.name]]; if (v && v.length) pics = v; });
  const cur = pics.includes(main) ? main : pics[0];
  const addons = items.filter(isAddon);
  const pers = (item.personalization || []).filter((p) => p !== 'none');
  const out = item.stockStatus === 'out_of_stock';
  const canOrder = item.type === 'product' && item.priceType === 'fixed' && item.priceKes != null;
  const fresh = tagVals(item, 'delivery').includes('nairobi');
  const min = item.minOrderQty || 1;
  const toggle = (s) => setExtra(extra.includes(s) ? extra.filter((x) => x !== s) : [...extra, s]);
  function addToCart() {
    add(item, Math.max(min, parseInt(qty, 10) || min), pers.includes('text') ? text.trim() : '', sel);
    extra.forEach((s) => { const a = addons.find((x) => x.sku === s); if (a) add(a, 1, '', {}); });
    setOk(true);
  }
  const v = videoOf(item.video);
  const feats = (item.features || []).map((f) => (typeof f === 'string' ? f : f.text || f.name || '')).filter(Boolean);
  const related = items.filter((i) => i.sku !== item.sku && !isAddon(i));
  const rel = related.filter((i) => i.categorySlug === item.categorySlug).concat(related.filter((i) => i.categorySlug !== item.categorySlug)).slice(0, 10);
  const shipText = DELIVERY.map((d) => d.label + (d.feeKes === 0 ? ' (free)' : d.feeKes == null ? '' : ' (' + formatKES(d.feeKes) + ')')).join('. ') + '.';
  const quoteUrl = 'https://wa.me/' + (SITE.whatsapp || '254794802462') + '?text=' + encodeURIComponent('Hello, I would like a quote for ' + item.name + ' (' + item.sku + ').');
  return (
    <div className="jx">
      <Link className="jx-back" to="/shop">Back</Link>
      <div className="jx-pdp">
        <div className="jx-gal">
          {pics.length > 1 ? <div className="jx-th">{pics.map((p) => <img key={p} src={img(p)} alt="" className={p === cur ? 'on' : ''} onClick={() => setMain(p)} />)}</div> : null}
          <Zoom src={img(cur)} alt={item.name} />
        </div>
        <div>
          <h1>{item.name}</h1>
          <p style={{ lineHeight: 1.6 }}>{item.description}</p>
          <hr className="jx-rule" />
          {groups.map((g) => {
            const dots = /colou?r/i.test(g.name) && g.values.every((x) => sw[String(x).toLowerCase()]);
            return (
              <div key={g.name} style={{ marginBottom: 10 }}>
                {dots ? (
                  <>
                    <div className="jx-dots">{g.values.map((x) => <button key={x} type="button" aria-label={x} className={'jx-dot' + (sel[g.name] === x ? ' on' : '')} style={{ background: sw[String(x).toLowerCase()] }} onClick={() => setSel({ ...sel, [g.name]: x })} />)}</div>
                    <div className="jx-cur">{sel[g.name]}</div>
                  </>
                ) : (
                  <div className="fld"><span>{g.name}: <b>{sel[g.name]}</b></span><br />
                    {g.values.map((x) => <button key={x} type="button" className={'chip' + (sel[g.name] === x ? ' on' : '')} style={{ marginRight: 6 }} onClick={() => setSel({ ...sel, [g.name]: x })}>{x}</button>)}
                  </div>
                )}
              </div>
            );
          })}
          {canOrder && !out ? (
            <>
              {pers.includes('text') ? <label className="jx-lab"><small>Name or text to print (optional)</small><input className="jx-in" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="A name, a date or a short message" /></label> : null}
              {pers.some((p) => p === 'logo' || p === 'photo') ? <p className="muted">To use a logo or photo, send it to us on WhatsApp after you order.</p> : null}
              {addons.length ? (
                <div className="jx-lab"><b>Make it special</b>
                  {addons.map((a) => <label className="ad" key={a.sku}><input type="checkbox" checked={extra.includes(a.sku)} onChange={() => toggle(a.sku)} /><span style={{ flex: 1 }}>{a.name}</span><b>+ {formatKES(a.priceKes)}</b></label>)}
                </div>
              ) : null}
              <label className="jx-lab"><small>Quantity</small><input className="jx-in" style={{ width: 90 }} type="number" min={min} value={qty} onChange={(e) => setQty(e.target.value)} /></label>
              <button type="button" className="jx-bar" onClick={addToCart}>Add to cart - {formatKES(item.priceKes)}</button>
              {ok ? <p>Added. <Link to="/cart"><b>View cart</b></Link> or <Link to="/shop">keep shopping</Link>.</p> : null}
            </>
          ) : canOrder ? (
            <button type="button" className="jx-bar" disabled>Sold out</button>
          ) : (
            <a className="jx-bar" target="_blank" rel="noreferrer" href={quoteUrl}>Ask for a quote on WhatsApp</a>
          )}
          <div className="jx-acc"><Acc title="Shipping"><p>{shipText}{fresh ? ' Fresh item: Nairobi delivery only.' : ''}</p></Acc></div>
        </div>
      </div>

      <div className="jx-vid">
        {v ? (v.yt
          ? <iframe title="Product video" src={'https://www.youtube-nocookie.com/embed/' + v.yt} allow="fullscreen; picture-in-picture" allowFullScreen />
          : <video src={v.mp4} controls playsInline preload="metadata" />)
          : <img src={img(pics[1] || pics[0])} alt="" style={{ width: '100%' }} />}
        <div>
          <h2>About this piece</h2>
          <div className="jx-acc">
            <Acc title="Features">{feats.length ? <ul>{feats.map((f) => <li key={f}>{f}</li>)}</ul> : <p>{item.description}</p>}</Acc>
            <Acc title="Details"><p>{item.category}{item.subcategory ? ' / ' + item.subcategory : ''}.{item.leadTimeDays ? ' Ready in about ' + item.leadTimeDays + ' days.' : ''}{min > 1 ? ' Minimum order ' + min + '.' : ''}</p></Acc>
            {pers.length ? <Acc title="Personalisation"><p>You can add: {pers.join(', ')}.</p></Acc> : null}
            <Acc title="Delivery and returns"><p>{shipText} Questions? Message us on WhatsApp.</p></Acc>
          </div>
        </div>
      </div>

      {pics.slice(v ? 1 : 2, 4).length ? <div className="jx-imgs">{pics.slice(v ? 1 : 2, 4).map((p) => <img key={p} src={img(p)} alt="" />)}</div> : null}
      <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 16px' }}><ReviewsSection store={STORE} sku={item.sku} apiUrl={API_URL} getToken={() => tokens.get()} loginHref="/account" title="Customer reviews" accent="#c9a14a" /></div>
      {rel.length ? <div className="jx-band"><div className="jx-bandin"><h2>Accompany With</h2><Rail list={rel} /></div></div> : null}
    </div>
  );
}
