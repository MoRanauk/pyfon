import Help from './Help.jsx';
import { Link, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Footer } from '@pyfon/ui';
import { themeVars } from '@pyfon/theme';
import { SITE, SOCIAL } from './site.js';
import { NAVTREE, CONTENT, ContentProvider, wa, mergeContent } from './content.js';
import { useCart, useAuth, useCatalog } from './store.jsx';
import { isAddon, tagVals } from './lib.js';
import { img, API_URL } from './api.js';
import { useSiteEdit } from './siteEdit.js';
import './bl.css';

const HER = 'linear-gradient(110deg,#A8456A 0%,#D98A98 55%,#F2BFA8 100%)';
const HIM = 'linear-gradient(110deg,#0D1320 0%,#3A1520 55%,#7A1F2E 100%)';
const leaf = (l) => ({ label: l[0], to: l[1], ext: l[2] });
const kids = (t) => (t.links ? t.links.map(leaf) : (t.cols || []).flatMap((c) => [c, c.more]).filter(Boolean).map((c) => ({ label: c.title, to: c.to, next: c.links.map(leaf) })));
const Lk = ({ l }) => (l[2] ? <a href={l[1]} target="_blank" rel="noreferrer">{l[0]}</a> : <Link to={l[1]}>{l[0]}</Link>);

function Drawer({ open, onClose }) {
  const [stack, setStack] = useState([]);
  useEffect(() => { if (!open) setStack([]); }, [open]);
  const view = stack[stack.length - 1];
  const rows = view ? view.items : NAVTREE.map((t) => ({ label: t.title, to: t.to, next: kids(t) }));
  return (
    <div className={'bl-dr' + (open ? ' on' : '')}>
      <div className="bl-dr-back" onClick={onClose} />
      <aside>
        <div className="bl-dr-top"><span>{SITE.name}</span><button type="button" aria-label="Close" onClick={onClose}>&times;</button></div>
        {view ? <button type="button" className="bl-dr-bk" onClick={() => setStack(stack.slice(0, -1))}>&lsaquo; {view.title}</button> : null}
        <ul>
          {view && view.to ? <li><Link to={view.to} onClick={onClose}>View all {view.title}</Link></li> : null}
          {rows.map((r) => (
            <li key={r.label}>
              {r.next ? <button type="button" onClick={() => setStack([...stack, { title: r.label, to: r.to, items: r.next }])}>{r.label}<i>&rsaquo;</i></button>
                : r.ext ? <a href={r.to} target="_blank" rel="noreferrer">{r.label}</a>
                  : <Link to={r.to} onClick={onClose}>{r.label}</Link>}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export default function Layout() {
  const { count } = useCart();
  const { user } = useAuth();
  const { items } = useCatalog();
  const go = useNavigate();
  const loc = useLocation();
  const [content, setContent] = useState(CONTENT);
  useEffect(() => { fetch(API_URL + '/v1/content/prestige').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.data) setContent(mergeContent(CONTENT, j.data)); }).catch(() => {}); }, []);
  useSiteEdit(content, setContent, CONTENT);
  const [ann, setAnn] = useState(() => { try { return Date.now() - Number(localStorage.getItem('ann_closed') || 0) > 86400000; } catch (e) { return true; } });
  const [ai, setAi] = useState(0);
  const [dr, setDr] = useState(false);
  const [mood, setMood] = useState(() => { try { return localStorage.getItem('gift_mood') === 'him' ? 'him' : 'her'; } catch (e) { return 'her'; } });
  const forParam = new URLSearchParams(loc.search).get('for');
  const ctxMood = ['him', 'dad'].includes(forParam) ? 'him' : ['her', 'mum', 'wife-girlfriend', 'sister-friend'].includes(forParam) ? 'her' : null;
  function pick(v) { setMood(v); try { localStorage.setItem('gift_mood', v); } catch (e) { /* ignore */ } }
  useEffect(() => { if (ctxMood) pick(ctxMood); }, [ctxMood]);
  useEffect(() => { window.scrollTo(0, 0); setDr(false); }, [loc.pathname]);
  const msgs = content.announce;
  const navOrder = content.navOrder || [];
  const pos = (t) => { const i = navOrder.indexOf(t.title); return i < 0 ? 99 : i; };
  const navList = navOrder.length ? [...NAVTREE].sort((a, b) => pos(a) - pos(b)) : NAVTREE;
  useEffect(() => {
    if (!ann || msgs.length < 2) return undefined;
    const t = setInterval(() => setAi((n) => (n + 1) % msgs.length), 4500);
    return () => clearInterval(t);
  }, [ann, msgs.length]);
  const vars = { ...themeVars(mood === 'him' ? 'prestigeHim' : 'prestige'), '--pf-hero': mood === 'him' ? HIM : HER, ...(content.theme || {}), background: 'var(--pf-bg)', color: 'var(--pf-text)' };
  const shop = (items || []).filter((i) => !isAddon(i));
  const picFor = (url) => {
    const e = [...new URLSearchParams(url.split('?')[1] || '').entries()][0];
    if (!e) return '';
    const it = shop.find((i) => tagVals(i, e[0]).includes(e[1]));
    return it ? img(it.image) : '';
  };
  function search(e) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('q');
    if (q) go('/shop?q=' + encodeURIComponent(q));
  }
  const top = (t) => (t.to ? <NavLink to={t.to} className={({ isActive }) => (isActive ? 'on' : '')}>{t.title}</NavLink> : <a href="/" onClick={(e) => e.preventDefault()}>{t.title}</a>);
  return (
    <ContentProvider value={content}>
      <div className="mood-root" style={vars}>
        {ann ? (
          <div className="ann">
            <span className="bl-msg" key={ai}>{msgs[ai] || SITE.announce}</span>
            <span className="bl-soc">{SOCIAL.filter((s) => s[1]).map((s) => <a key={s[0]} href={s[1]} target="_blank" rel="noreferrer">{s[0]}</a>)}</span>
            <button type="button" aria-label="Close" onClick={() => { setAnn(false); try { localStorage.setItem('ann_closed', String(Date.now())); } catch (e) { /* ignore */ } }}>&times;</button>
          </div>
        ) : null}
        <div className="page">
          <header className="hdr">
            <div className="wrap h1row">
              <span />
              <Link to="/" className="logo">{SITE.name}</Link>
              <div className="hico">
                <Link to="/account">{user ? 'Account' : 'Sign in'}</Link>{user ? <Link to="/orders">Orders</Link> : null}
                <Link to="/cart">Cart{count ? <span className="cnt">{count}</span> : null}</Link>
                <button type="button" className="bl-burger" aria-label="Menu" onClick={() => setDr(true)}><i /><i /><i /></button>
              </div>
            </div>
            <form className="h2row" onSubmit={search}>
              <input className="sbar" name="q" placeholder="Search gifts" aria-label="Search gifts" />
            </form>
            <nav className="cats">
              {navList.map((t) => {
                if (t.cols) {
                  return (
                    <div key={t.title} data-nt={t.title} className="dd">
                      {top(t)}
                      <div className={'bl-panel bl-mega' + (t.wide ? ' bl-full' : '')}>
                        {t.cols.map((cl) => (
                          <div key={cl.title}>
                            <h5>{cl.to ? <Link to={cl.to}>{cl.title}</Link> : cl.title}</h5>
                            {cl.links.map((l) => <Lk key={l[0]} l={l} />)}
                            {cl.more ? <h5 style={{ marginTop: 18 }}>{cl.more.title}</h5> : null}
                            {cl.more ? cl.more.links.map((l) => <Lk key={l[0]} l={l} />) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (t.strip) {
                  return (
                    <div key={t.title} data-nt={t.title} className="dd bl-wide">
                      {top(t)}
                      <div className="bl-strip">
                        {t.links.map((l) => (
                          <Link key={l[0]} to={l[1]} className="bl-pic">
                            <span className="bl-circ"><b>{l[0].replace('For ', '').charAt(0)}</b>{picFor(l[1]) ? <img src={picFor(l[1])} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}</span>
                            <em>{l[0]}</em>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={t.title} data-nt={t.title} className="dd">
                    {top(t)}
                    <div className="menu">{t.links.map((l) => <Lk key={l[0]} l={l} />)}</div>
                  </div>
                );
              })}
            </nav>
          </header>
          <main style={{ minHeight: '60vh' }}><Outlet context={{ mood }} /></main>
        </div>
        <div className="ftr">
          <div className="wrap cols">
            <div><h4>Shop</h4>{NAVTREE.filter((t) => t.to).map((t) => <Link key={t.title} to={t.to}>{t.title}</Link>)}</div>
            <div>
              <h4>Customer care</h4>
              <a href={wa('Hello, I need help with a gift order.')} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
              <a href={wa('Hello, I would like a quote for corporate gifting.')} target="_blank" rel="noreferrer">Corporate gifting</a>
              <Link to="/cart">Your cart</Link><Link to="/orders">My orders</Link><Link to="/track">Track my order</Link>
            </div>
          </div>
        </div>
        <Drawer open={dr} onClose={() => setDr(false)} />
        <Help />
        <Footer />
      </div>
    </ContentProvider>
  );
}
