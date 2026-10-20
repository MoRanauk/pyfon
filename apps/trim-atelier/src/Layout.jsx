import Help from './Help.jsx';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Footer } from '@pyfon/ui';
import { SITE } from './site.js';
import { useCart, useAuth, useCatalog } from './store.jsx';
import { groupCats, brandsOf } from './cats.js';
import './tzhome.css';

const wa = (t) => 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(t);

export default function Layout() {
  const { count } = useCart();
  const { user } = useAuth();
  const { items } = useCatalog();
  const go = useNavigate();
  const loc = useLocation();
  const [ann, setAnn] = useState(true);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const cats = groupCats(items);
  function search(e) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q');
    if (q) go('/shop?q=' + encodeURIComponent(q));
  }
  return (
    <div>
      {ann ? <div className="ann">{SITE.announce}<button type="button" aria-label="Close" onClick={() => setAnn(false)}>&times;</button></div> : null}
      <header className="t-hdr">
        <div className="wrap t-top">
          <form className="t-search" onSubmit={search}><input name="q" placeholder="Search" aria-label="Search" /></form>
          <Link to="/" className="t-logo">{SITE.name}</Link>
          <div className="t-ico">
            <Link to="/account">{user ? 'Account' : 'Sign in'}</Link>
            <Link to="/cart">Cart{count ? <span className="cnt">{count}</span> : null}</Link>
          </div>
        </div>
        {loc.pathname !== '/' ? <nav className="t-nav">
          {cats.map((c) => (
            <div key={c.key} className="t-mi">
              <NavLink to={'/c/' + c.key}>{c.title}</NavLink>
              <div className="t-mega">
                <div className="wrap t-cols">
                  {brandsOf(c).map(([b, list]) => (
                    <div key={b}>
                      <Link className="t-bh" to={'/c/' + c.key + '?sub=' + encodeURIComponent(b)}>{b}</Link>
                      {list.slice(0, 4).map((i) => <Link key={i.sku} to={'/p/' + encodeURIComponent(i.sku)}>{i.name}</Link>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav> : null}
      </header>
      <main key={loc.pathname} className="swipe-page" style={{ minHeight: '60vh' }}><Outlet /></main>
      <div className="ftr">
        <div className="wrap cols">
          <div><h4>Collection</h4>{cats.map((c) => <Link key={c.key} to={'/c/' + c.key}>{c.title}</Link>)}</div>
          <div>
            <h4>Customer care</h4>
            <a href={wa('Hello, I need help with an order.')} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
            <a href={wa('Hello, I have a question about delivery and returns.')} target="_blank" rel="noreferrer">Delivery and returns</a>
            <a href={wa('Hello, I would like a quote for corporate gifting.')} target="_blank" rel="noreferrer">Corporate gifting</a>
          </div>
        </div>
      </div>
      <Help />
      <Footer />
    </div>
  );
}
