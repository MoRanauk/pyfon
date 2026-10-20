import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { SITE, MENU } from './site.js';
import { useCatalog } from './store.jsx';
import { img } from './api.js';
import { isAddon, tagVals, pretty } from './lib.js';

export default function Home() {
  const { mood } = useOutletContext();
  const { items } = useCatalog();
  const [pr, setPr] = useState(0);
  const shop = items.filter((i) => !isAddon(i));
  const first = (m) => shop.find((i) => i.categorySlug === m.key && i.image);
  const uniq = (p) => [...new Set(shop.flatMap((i) => tagVals(i, p)))].slice(0, 12);
  const c = SITE.moods[mood];
  const bg = c.hero ? { backgroundImage: 'linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.2)), url(' + c.hero + ')' } : undefined;
  function onScroll(e) {
    const el = e.currentTarget;
    const max = el.scrollWidth - el.clientWidth;
    setPr(max > 0 ? el.scrollLeft / max : 0);
  }
  function subscribe(e) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    const t = 'Hello ' + SITE.name + ', please add me to your updates.' + (email ? ' My email: ' + email : '');
    window.open('https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  }
  return (
    <>
      <section className={'hero' + (c.hero ? '' : ' nophoto')} style={bg}>
        <div className="wrap">
          <h1>{c.title}</h1>
          <p>{c.text}</p>
          <Link className="hbtn" to="/shop"><span>Shop now</span><span>&rarr;</span></Link>
        </div>
      </section>

      <section className="wrap sec">
        <div className="railrow">
          <div className="railh"><h2>Gifts</h2></div>
          <div className="railbox">
            <div className="rail" onScroll={onScroll}>
              {MENU.filter((m) => m.by === 'cat').map((m) => (
                <Link key={m.key} to={'/c/' + m.key} className="tile">
                  <div className="ph">{first(m) ? <img src={img(first(m).image)} alt="" loading="lazy" /> : null}</div>
                  <b>{m.title}</b>
                </Link>
              ))}
            </div>
            <div className="track"><i style={{ left: (pr * 70) + '%' }} /></div>
          </div>
        </div>
        {uniq('occasion').length ? <div className="pills">{uniq('occasion').map((v) => <Link key={v} className="pill" to={'/c/occasions?occasion=' + v}>{pretty(v)}</Link>)}</div> : null}
        {uniq('for').length ? <div className="pills">{uniq('for').map((v) => <Link key={v} className="pill" to={'/c/gifts-for?for=' + v}>For {pretty(v).toLowerCase()}</Link>)}</div> : null}
      </section>

      <section className="quote sec center">
        <div className="wrap">
          <span className="qm">&ldquo;</span>
          <p>{SITE.quote}</p>
          <span className="muted">{SITE.quoteBy}{SITE.showSample ? ' (sample until real reviews arrive)' : ''}</span>
        </div>
      </section>

      <section className="split">
        <div className="l">
          <div className="mono">PGH</div>
          <h2>Wrapped by hand, sent with love</h2>
          <p>Every gift is checked and wrapped by our team before it leaves us, then delivered for you.</p>
          <Link className="btn line" to="/c/occasions">Shop by occasion</Link>
        </div>
        <div className="r">
          <span className="muted">Make it yours</span>
          <div className="ln">Your own card message</div>
          <div className="ln">Ribbon and gift wrap</div>
          <div className="ln">A surprise delivery</div>
        </div>
      </section>

      {shop.length ? (
        <section className="wrap sec">
          <div className="shead">
            <h2>Join us and share the joy of giving</h2>
            <a href={'https://wa.me/' + SITE.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
          <div className="strip">{shop.slice(0, 6).map((i) => <img key={i.sku} src={img(i.image)} alt={i.name} loading="lazy" />)}</div>
        </section>
      ) : null}

      <section className="wrap sec sub">
        <p>Keep informed on new gifts and special offers</p>
        <form onSubmit={subscribe}><input name="email" type="email" placeholder="Email Address" aria-label="Email address" /><button type="submit" aria-label="Subscribe">&rarr;</button></form>
      </section>
    </>
  );
}
