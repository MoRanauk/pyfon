import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from './site.js';
import { useCatalog, useCart } from './store.jsx';
import { img } from './api.js';
import { isAddon, optionGroups, priceText } from './lib.js';
import { groupCats } from './cats.js';

function Best({ item }) {
  const { add } = useCart();
  const groups = optionGroups(item.options);
  const [sel, setSel] = useState(() => Object.fromEntries(groups.map((g) => [g.name, g.values[0]])));
  const [ok, setOk] = useState(false);
  const can = item.type === 'product' && item.priceType === 'fixed' && item.priceKes != null && item.stockStatus !== 'out_of_stock';
  const to = '/p/' + encodeURIComponent(item.sku);
  return (
    <div className="t-best">
      <Link to={to}><div className="ph"><img src={img(item.image)} alt={item.name} loading="lazy" /></div><b>{item.name}</b></Link>
      <div className="pr">{priceText(item)}</div>
      {can ? groups.map((g) => (
        <select key={g.name} aria-label={g.name} value={sel[g.name]} onChange={(e) => setSel({ ...sel, [g.name]: e.target.value })}>
          {g.values.map((v) => <option key={v}>{v}</option>)}
        </select>
      )) : null}
      {can
        ? <button type="button" className="btn" onClick={() => { add(item, item.minOrderQty || 1, '', sel); setOk(true); setTimeout(() => setOk(false), 1800); }}>{ok ? 'Added' : 'Add to cart'}</button>
        : <Link className="btn line" to={to}>View details</Link>}
    </div>
  );
}

export default function Home() {
  const { items } = useCatalog();
  const rail = useRef(null);
  const shop = items.filter((i) => !isAddon(i));
  const best = [...shop.filter((i) => i.featured), ...shop.filter((i) => !i.featured)].slice(0, 10);
  const cats = groupCats(items);
  const slide = (d) => { if (rail.current) rail.current.scrollBy({ left: d * 282, behavior: 'smooth' }); };
  function subscribe(e) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    const t = 'Hello ' + SITE.name + ', please add me to your updates.' + (email ? ' My email: ' + email : '');
    window.open('https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  }
  return (
    <>
      <section className="t-hero">
        <div className="wrap">
          <span className="t-eye">{SITE.heroEye}</span>
          <h1>{SITE.heroTitle}</h1>
          <p>{SITE.heroText}</p>
          <Link className="btn" to="/shop">Shop the collection</Link>
        </div>
      </section>

      {best.length ? (
        <section className="wrap sec">
          <h2 className="t-h2">Best sellers</h2>
          <div className="t-rail" ref={rail}>{best.map((i) => <Best key={i.sku} item={i} />)}</div>
          <div className="t-arrows"><button type="button" aria-label="Previous" onClick={() => slide(-1)}>&larr;</button><button type="button" aria-label="Next" onClick={() => slide(1)}>&rarr;</button></div>
        </section>
      ) : null}

      <section className="t-diff">
        <div className="l" />
        <div className="r">
          <h2>The TriM difference</h2>
          <div><h3>Carefully sourced</h3><p>Every piece is chosen by our team before it reaches the collection.</p></div>
          <div><h3>Beautifully presented</h3><p>Ready to give, and ready to wear.</p></div>
          <div><h3>Personal service</h3><p>Ask us anything on WhatsApp, from sizing to delivery.</p></div>
          <Link className="btn line" to="/shop" style={{ alignSelf: 'flex-start' }}>Explore</Link>
        </div>
      </section>

      {cats.length ? (
        <section className="wrap sec">
          <h2 className="t-h2">Shop by category</h2>
          <div className="t-tiles">
            {cats.map((c) => { const f = c.items.find((i) => i.image); return (
              <Link key={c.key} to={'/c/' + c.key} className="t-tile">{f ? <img src={img(f.image)} alt="" loading="lazy" /> : null}<span>{c.title}</span></Link>
            ); })}
          </div>
        </section>
      ) : null}

      <section className="wrap sec">
        <h2 className="t-h2">What our customers say</h2>
        <div className="t-rev">{SITE.reviews.map((r, k) => (
          <div key={k}><div className="st">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p>&ldquo;{r.t}&rdquo;</p><span className="muted">{r.by}{SITE.showSample ? ' (sample)' : ''}</span></div>
        ))}</div>
      </section>

      {shop.length ? (
        <section className="wrap sec">
          <h2 className="t-h2">Shop the look</h2>
          <div className="t-look">{shop.slice(0, 6).map((i) => <Link key={i.sku} to={'/p/' + encodeURIComponent(i.sku)}><img src={img(i.image)} alt={i.name} loading="lazy" /></Link>)}</div>
        </section>
      ) : null}

      <section className="wrap sec">
        <h2 className="t-h2">Buying guides</h2>
        <div className="t-guides">{SITE.guides.map((g) => <details key={g.t}><summary>{g.t}</summary><p>{g.x}</p></details>)}</div>
      </section>

      <section className="wrap sec sub">
        <p>Keep informed on new arrivals and private offers</p>
        <form onSubmit={subscribe}><input name="email" type="email" placeholder="Email Address" aria-label="Email address" /><button type="submit" aria-label="Subscribe">&rarr;</button></form>
      </section>
    </>
  );
}
