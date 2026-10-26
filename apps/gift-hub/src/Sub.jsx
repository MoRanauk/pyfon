import { Link, useLocation, useParams } from 'react-router-dom';
import './sub.css';
import { img } from './api.js';
import { useCatalog } from './store.jsx';
import { isAddon, tagVals, priceText, optionGroups, pretty } from './lib.js';
import { SITE, MENU } from './site.js';
import { useContent, wa } from './content.js';
import { Trail, trailFor } from './Crumbs.jsx';

const PARAMS = ['for', 'occasion', 'flower', 'style', 'colour', 'delivery', 'node'];
const RANGE = { u3: [0, 3000], m3: [3000, 5000], m5: [5000, 8000], o8: [8000, 1e9] };
const RLAB = { u3: 'Under KES 3,000', m3: 'KES 3,000 to 5,000', m5: 'KES 5,000 to 8,000', o8: 'KES 8,000 and above' };
const low = (s) => String(s || '').toLowerCase();

function fallback(m, sp) {
  if (sp.get('sub')) return sp.get('sub');
  if (sp.get('price')) return RLAB[sp.get('price')] || '';
  for (const p of PARAMS) {
    const v = sp.get(p);
    if (v) { const s = m ? (m.subs || []).find((x) => x[1] === v) : null; return s ? s[0] : pretty(v); }
  }
  if (sp.get('q')) return 'Results for \u201c' + sp.get('q') + '\u201d';
  return m ? m.title : 'All gifts';
}

export function GiftCard({ i }) {
  const opts = optionGroups(i.options).length > 0;
  const personal = (i.personalization || []).includes('text');
  const to = '/p/' + i.sku;
  return (
    <div className="sbp-card">
      <Link to={to} className="sbp-pic">
        <img src={img(i.image)} alt={i.name} loading="lazy" />
        {personal ? <span className="sbp-tag">Add your name</span> : null}
      </Link>
      <Link to={to} className="sbp-name">{i.name}</Link>
      <div className="sbp-price">{priceText(i)}</div>
      <Link to={to} className="sbp-b">{opts ? 'Choose options' : 'View gift'}</Link>
    </div>
  );
}

export default function Sub() {
  const { key } = useParams();
  const loc = useLocation();
  const sp = new URLSearchParams(loc.search);
  const c = useContent();
  const { items, ready } = useCatalog();
  const m = MENU.find((x) => x.key === key);
  let list = (items || []).filter((i) => !isAddon(i));
  if (m && m.by === 'cat') list = list.filter((i) => i.categorySlug === key);
  if (m && m.by === 'tag') list = list.filter((i) => tagVals(i, m.prefix).length);
  if (key && !m) list = list.filter((i) => i.categorySlug === key);
  if (sp.get('sub')) list = list.filter((i) => low(i.subcategory) === low(sp.get('sub')));
  PARAMS.forEach((p) => { const v = sp.get(p); if (v) list = list.filter((i) => tagVals(i, p).includes(v)); });
  const pr = RANGE[sp.get('price')];
  if (pr) list = list.filter((i) => i.priceKes && Number(i.priceKes) >= pr[0] && Number(i.priceKes) < pr[1]);
  const q = low(sp.get('q'));
  if (q) list = list.filter((i) => low([i.name, i.description, i.category, i.subcategory, (i.tags || []).join(' ')].join(' ')).includes(q));
  const trail = trailFor(loc.pathname, loc.search, fallback(m, sp));
  const title = trail[trail.length - 1][0];
  const eyebrow = trail.length > 1 ? trail[0][0] : SITE.name;
  const lead = c.msg[low(title)] || ('Hand-picked ' + low(title) + ' from ' + SITE.name + '.');
  const intro = lead + ' ' + (c.ctx[key] || c.ctx.all);
  const toGrid = () => { const e = document.getElementById('sbp-grid'); if (e) e.scrollIntoView({ behavior: 'smooth' }); };
  const ask = wa('Hello, I am looking for: ' + title);
  return (
    <div>
      <Trail trail={trail} />
      <section className="sbp-hero">
        <span className="sbp-pill">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className="sbp-ticks">{c.ticks.map((t) => <span key={t}>{t}</span>)}</div>
        <div className="sbp-btns">
          <button type="button" className="sbp-b" onClick={toGrid}>See the gifts</button>
          <a className="sbp-b alt" href={ask} target="_blank" rel="noreferrer">WhatsApp us</a>
        </div>
      </section>
      <div className="sbp-trust">{c.trust.map((t) => <span key={t}>{t}</span>)}</div>
      <div className="sbp-wrap" id="sbp-grid">
        {list.length ? <p className="sbp-count">{list.length} {list.length === 1 ? 'gift' : 'gifts'}</p> : null}
        {!list.length ? (
          <div className="sbp-empty">
            <p>{ready ? 'No gifts here yet. Tell us what you need and we will help.' : 'Loading...'}</p>
            {ready ? <a className="sbp-b" href={ask} target="_blank" rel="noreferrer">Ask on WhatsApp</a> : null}
          </div>
        ) : null}
        <div className="sbp-grid">{list.map((i) => <GiftCard key={i.sku} i={i} />)}</div>
      </div>
      <section className="sbp-faq">
        <h2>{title}, got questions?</h2>
        {c.faq.map((f) => <details key={f[0]}><summary>{f[0]}</summary><p>{f[1]}</p></details>)}
      </section>
      <section className="sbp-more">
        <h2>More ways to show you care</h2>
        <div className="sbp-cards">
          {c.more.filter((x) => x[2] !== '/c/' + key).map((x) => <Link key={x[0]} to={x[2]}><i>{x[0].charAt(0)}</i><b>{x[0]}</b><span>{x[1]}</span></Link>)}
        </div>
      </section>
      <section className="sbp-cta">
        <h2>Find the right gift today</h2>
        <p>Order online, or send us a message and we will help you choose.</p>
        <div className="sbp-btns">
          <Link className="sbp-b" to="/shop">Shop all gifts</Link>
          <a className="sbp-b alt" href={ask} target="_blank" rel="noreferrer">WhatsApp us</a>
        </div>
      </section>
    </div>
  );
}
