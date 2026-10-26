import { Link, useOutletContext } from 'react-router-dom';
import { ReviewsSection } from '@pyfon/ui';
import { STORE, API_URL, tokens } from './api.js';
import './home2.css';
import { img } from './api.js';
import { useCatalog } from './store.jsx';
import { isAddon } from './lib.js';
import { SITE } from './site.js';
import { useContent, wa } from './content.js';
import { GiftCard } from './Sub.jsx';
import { useSiteImages } from './siteImages.js';

const IC = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pen: <path d="M4 20l4-1 11-11-3-3L5 16z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  gift: <path d="M4 9h16v4H4zM6 13v7h12v-7M12 9v11M12 9c-3-4-6-1-3 0M12 9c3-4 6-1 3 0" />,
};

function Rail5({ r, shop }) {
  const list = shop.filter((i) => (r.tag ? (i.tags || []).includes(r.tag) : i.categorySlug === r.cat)).slice(0, 5);
  if (!list.length) return null;
  return (
    <section className="hm-sec">
      <div className="hm-head"><h2>{r.title}</h2><Link to={r.to}>View all</Link></div>
      <div className="hm-rail">{list.map((i) => <GiftCard key={i.sku} i={i} />)}</div>
    </section>
  );
}

export default function Home() {
  const { mood } = useOutletContext();
  const IM = useSiteImages('prestige');
  const H = useContent().home;
  const { items } = useCatalog();
  const shop = (items || []).filter((i) => !isAddon(i));
  const mo = SITE.moods[mood] || SITE.moods.her;
  const byTag = (t) => { const it = shop.find((i) => (i.tags || []).includes(t)); return it ? img(it.image) : ''; };
  const byCat = (s) => { const it = shop.find((i) => i.categorySlug === s); return it ? img(it.image) : ''; };
  const him = mood === 'him';
  const ticks = [...useContent().ticks, ...useContent().ticks];
  return (
    <div>
      <div className="hm-rounds">
        {H.rounds.map((r) => (
          <Link key={r[0]} to={r[1]} className="hm-r">
            <span className="hm-rc"><b>{r[0].charAt(0)}</b>{byTag(r[2]) ? <img src={byTag(r[2])} alt="" /> : null}</span>{r[0]}
          </Link>
        ))}
      </div>
      <section className="hm-hero">
        <div className="hm-hin">
          <div className="hm-arch">{(IM['hero-' + (mood === 'him' ? 'him' : 'her')] || mo.hero) ? <img src={IM['hero-' + (mood === 'him' ? 'him' : 'her')] || mo.hero} alt="" /> : <div className="hm-ph" />}{H.badge ? <span className="hm-badge">{H.badge}</span> : null}</div>
          <div className="hm-txt">
            {H.pill ? <span className="hm-pill">{H.pill}</span> : null}
            <h1>{mo.title}</h1>
            <p>{mo.text}</p>
            <Link className="hm-btn" to={him ? '/c/gifts-for?for=him' : '/c/flowers'}>{him ? 'Shop gifts for him' : 'Shop flowers'}</Link>
          </div>
        </div>
      </section>
      <div className="hm-tick"><div>{ticks.map((t, n) => <span key={n}>{t}</span>)}</div></div>
      {H.rails[0] ? <Rail5 r={H.rails[0]} shop={shop} /> : null}
      <section className="hm-sec">
        <div className="hm-head"><h2>{H.circlesTitle}</h2></div>
        <div className="hm-circs">
          {H.circles.map((c) => <Link key={c[0]} to={c[1]}><div className="hm-cc">{byCat(c[2]) ? <img src={byCat(c[2])} alt="" /> : c[0].charAt(0)}</div>{c[0]}</Link>)}
        </div>
      </section>
      <section className="hm-band"><small>{H.band.eyebrow}</small><p>{H.band.text}</p><Link to={H.band.to}>{H.band.button} &rarr;</Link></section>
      {H.rails[1] ? <Rail5 r={H.rails[1]} shop={shop} /> : null}
      <section className="hm-feat">
        <div className="hm-fin">
          <div className="hm-fimg">{(IM.feature || H.feature.img) ? <img src={IM.feature || H.feature.img} alt="" /> : null}</div>
          <div className="hm-fcard"><small>{H.feature.eyebrow}</small><h2>{H.feature.title}</h2><p>{H.feature.text}</p><Link className="sbp-b" to={H.feature.to}>{H.feature.button}</Link></div>
        </div>
      </section>
      {H.rails[2] ? <Rail5 r={H.rails[2]} shop={shop} /> : null}
      <section className="hm-band"><small>{H.abroad.eyebrow}</small><p>{H.abroad.text}</p><a href={wa(H.abroad.ask)} target="_blank" rel="noreferrer">{H.abroad.button} &rarr;</a></section>
      <section className="hm-sec">
        <div className="hm-head"><h2>{H.countTitle}</h2></div>
        <div className="hm-ct">
          {H.count.map((c) => <div key={c[1]}><div className="hm-ic"><svg viewBox="0 0 24 24">{IC[c[0]] || IC.gift}</svg></div><b>{c[1]}</b><p>{c[2]}</p></div>)}
        </div>
      </section>
      <section className="hm-rev"><ReviewsSection store={STORE} apiUrl={API_URL} getToken={() => tokens.get()} loginHref="/account" title={H.reviewTitle} accent="#c9a14a" /></section>
      <section className="hm-gl">
        <div>
          <h2>{H.glance.title}</h2>
          {H.glance.text.map((t) => <p key={t}>{t}</p>)}
          <p><b>{H.glance.chipsTitle}</b></p>
          {H.glance.chips.map((c) => <Link key={c[0]} to={c[1]} className="hm-chip">{c[0]}</Link>)}
        </div>
        <div className="hm-gc">{H.glance.facts.map((f) => <div key={f[0]}><b>{f[0]}</b><span>{f[1]}</span></div>)}</div>
      </section>
    </div>
  );
}
