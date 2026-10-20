import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Footer } from '@pyfon/ui';
import { themeVars } from '@pyfon/theme';
import { SITE, MENU } from './site.js';
import { useCart, useAuth, useCatalog } from './store.jsx';
import { isAddon, tagVals, pretty } from './lib.js';

const wa = (t) => 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(t);
const HER = 'linear-gradient(110deg,#A8456A 0%,#D98A98 55%,#F2BFA8 100%)';
const HIM = 'linear-gradient(110deg,#0D1320 0%,#3A1520 55%,#7A1F2E 100%)';

export default function Layout() {
  const { count } = useCart();
  const { user } = useAuth();
  const { items } = useCatalog();
  const go = useNavigate();
  const loc = useLocation();
  const [ann, setAnn] = useState(true);
  const [mood, setMood] = useState(() => { try { return localStorage.getItem('gift_mood') === 'him' ? 'him' : 'her'; } catch (e) { return 'her'; } });
  const urlHim = new URLSearchParams(loc.search).get('for') === 'him';
  function pick(v) { setMood(v); try { localStorage.setItem('gift_mood', v); } catch (e) { /* ignore */ } }
  useEffect(() => { if (urlHim) pick('him'); }, [urlHim]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const home = loc.pathname === '/';
  const vars = { ...themeVars(mood === 'him' ? 'prestigeHim' : 'prestige'), '--pf-hero': mood === 'him' ? HIM : HER, background: 'var(--pf-bg)', color: 'var(--pf-text)' };
  const shop = (items || []).filter((i) => !isAddon(i));
  const subs = (m) => {
    const out = [...(m.subs || [])];
    const have = new Set(out.map((s) => String(s[1]).toLowerCase()));
    const raw = m.by === 'cat'
      ? shop.filter((i) => i.categorySlug === m.key && i.subcategory).map((i) => i.subcategory)
      : shop.flatMap((i) => tagVals(i, m.prefix));
    [...new Set(raw)].forEach((v) => {
      if (!have.has(String(v).toLowerCase())) out.push([m.by === 'cat' ? v : (m.key === 'gifts-for' ? 'For ' : '') + pretty(v), v]);
    });
    return out.slice(0, 14);
  };
  const subTo = (m, v) => (m.by === 'cat' ? '/c/' + m.key + '?sub=' + encodeURIComponent(v) : '/c/' + m.key + '?' + m.prefix + '=' + encodeURIComponent(v));
  function search(e) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q');
    if (q) go('/shop?q=' + encodeURIComponent(q));
  }
  return (
    <div className="mood-root" style={vars}>
      {ann ? <div className="ann">{SITE.announce}<button type="button" aria-label="Close" onClick={() => setAnn(false)}>&times;</button></div> : null}
      <div className="page">
        <header className={'hdr' + (home ? ' over' : '')}>
          <div className="wrap h1row">
            <div className="mood">
              <button type="button" className={mood === 'her' ? 'on' : ''} onClick={() => pick('her')}>Her</button>
              <button type="button" className={mood === 'him' ? 'on' : ''} onClick={() => pick('him')}>Him</button>
            </div>
            <Link to="/" className="logo">{SITE.name}</Link>
            <div className="hico">
              <Link to="/account">{user ? 'Account' : 'Sign in'}</Link>
              <Link to="/cart">Cart{count ? <span className="cnt">{count}</span> : null}</Link>
            </div>
          </div>
          <form className="h2row" onSubmit={search}>
            <input className="sbar" name="q" placeholder="Search gifts" aria-label="Search gifts" />
          </form>
          <nav className="cats">
            {MENU.map((m) => {
              const list = subs(m);
              return (
                <div key={m.key} className="dd">
                  <NavLink to={'/c/' + m.key} className={({ isActive }) => (isActive ? 'on' : '')}>{m.title}</NavLink>
                  {list.length ? <div className="menu">{list.map((s) => <Link key={s[1]} to={subTo(m, s[1])}>{s[0]}</Link>)}</div> : null}
                </div>
              );
            })}
          </nav>
        </header>
        <main style={{ minHeight: '60vh' }}><Outlet context={{ mood }} /></main>
      </div>
      <div className="ftr">
        <div className="wrap cols">
          <div><h4>Shop</h4>{MENU.map((m) => <Link key={m.key} to={'/c/' + m.key}>{m.title}</Link>)}</div>
          <div>
            <h4>Customer care</h4>
            <a href={wa('Hello, I need help with a gift order.')} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
            <a href={wa('Hello, I would like a quote for corporate gifting.')} target="_blank" rel="noreferrer">Corporate gifting</a>
            <Link to="/cart">Your cart</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

