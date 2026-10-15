import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCart } from './CartState.jsx';
import { useAuth, displayName } from './AuthState.jsx';
import { useCatalog } from './CatalogState.jsx';
import { api, STORE } from './api.js';
import { buildGroups } from './groups.js';
import { copyFor, kids, slugOf } from './tree.js';
import { pushRecent } from './recent.js';
import { Announce, SearchBar, Burger, SearchIco, CartIco } from './Header.jsx';
import { SearchHintProvider } from './SearchHint.jsx';
import SideMenu from './SideMenu.jsx';
import SiteFooter from './SiteFooter.jsx';
import { FloatPair } from './FloatPair.jsx';

function Shell({ lite }) {
  const { cats, tree } = useCatalog();
  // Drawer tree: top-level rows open the group landing page (/c/<key>).
  const menuTree = useMemo(() => tree.map((g) => ({ ...g, to: '/c/' + g.key })), [tree]);
  // The footer still expects { key, title, cats }, so build that from the tree.
  const footGroups = useMemo(() => (tree.length
    ? tree.map((g) => ({
        key: g.key,
        title: g.title,
        cats: kids(g).filter((c) => c.count > 0).map((c) => ({ slug: slugOf(c), name: c.title, itemCount: c.count }))
      }))
    : buildGroups(cats)), [tree, cats]);
  const [open, setOpen] = useState('');
  const [menu, setMenu] = useState(false);
  const [sOpen, setSOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(0);
  const [mega, setMega] = useState({});
  const loc = useLocation();
  const { count } = useCart();
  const { user } = useAuth();

  useEffect(() => { setOpen(''); setMenu(false); setSOpen(false); }, [loc.pathname, loc.search]);
  // Remember product pages the visitor opens (feeds /recent and /for-you).
  useEffect(() => {
    const m = loc.pathname.match(/^\/p\/([^/]+)/);
    if (m) pushRecent(decodeURIComponent(m[1]));
  }, [loc.pathname]);
  useEffect(() => {
    const f = () => setScrolled((prev) => (prev ? window.scrollY > 10 : window.scrollY > 60));
    const k = (e) => { if (e.key === 'Escape') { setOpen(''); setMenu(false); } };
    window.addEventListener('scroll', f, { passive: true });
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('keydown', k); };
  }, []);
  useEffect(() => { if (count) setBump((b) => b + 1); }, [count]);

  const g = tree.find((x) => x.key === open);
  // Fetch a few pictures for the open mega-menu group (once per group).
  useEffect(() => {
    if (!g || mega[g.key]) return undefined;
    let live = true;
    api.catalog.items(STORE, { node: slugOf(g), limit: 12 })
      .then((d) => { if (live) setMega((m) => ({ ...m, [g.key]: d.items.filter((i) => i.image).slice(0, 8) })); })
      .catch(() => {});
    return () => { live = false; };
  }, [g, mega]);

  const logo = <Link to="/" className="logo">M &amp; Co. Brands</Link>;
  const cart = (
    <Link to="/cart" className="cartlink" aria-label="Cart">
      <CartIco />
      {count ? <b key={bump} className="badge2">{count}</b> : null}
    </Link>
  );

  return (
    <SearchHintProvider>
      <header className={'site' + (scrolled ? ' small' : '')}>
        <Announce />
        <div className="hbar">
          {lite ? (
            <>
              <div className="wrap hrow lite">
                <div className="lleft">
                  <button type="button" className="iconbtn" aria-label="Open menu" onClick={() => setMenu(true)}><Burger /></button>
                  <button type="button" className="iconbtn" aria-label="Search" onClick={() => setSOpen(!sOpen)}><SearchIco /></button>
                </div>
                {logo}
                <div className="lright">{cart}</div>
              </div>
              {sOpen ? <div className="wrap lsearch"><SearchBar /></div> : null}
            </>
          ) : (
            <div className="wrap hrow">
              <button type="button" className="iconbtn onlymobile" aria-label="Open menu" onClick={() => setMenu(true)}><Burger /></button>
              {logo}
              <SearchBar />
              <nav className="hlinks">
                <Link to="/sell">Sell with us</Link>
                <Link to="/quote">Get a quote</Link>
                <Link to="/account">{user ? displayName(user).split(' ')[0] : 'Login'}</Link>
                {!user ? <Link className="signup" to="/account?mode=up">Sign up</Link> : null}
              </nav>
              {cart}
            </div>
          )}
        </div>
        {!lite ? (
          <div className="groupbar" onMouseLeave={() => setOpen('')}>
            <div className="wrap gbar">
              {tree.map((gr) => (
                <button
                  key={gr.key}
                  type="button"
                  className={'gbtn' + (open === gr.key ? ' on' : '')}
                  aria-expanded={open === gr.key}
                  onMouseEnter={() => setOpen(gr.key)}
                  onClick={() => setOpen(open === gr.key ? '' : gr.key)}
                >
                  {gr.title}<span aria-hidden="true">{'\u25be'}</span>
                </button>
              ))}
            </div>
            {g ? (
              <div className="mega" key={g.key}>
                <div className="wrap megain">
                  <div className="megacats">
                    <small>{g.title}</small>
                    {kids(g).map((c) => (
                      <Link key={c.key} to={c.to}>{c.title}{c.count ? <em>{c.count}</em> : null}</Link>
                    ))}
                    <Link className="megaall" to={'/c/' + g.key}>View all {g.title}</Link>
                  </div>
                  {(mega[g.key] || []).length ? <FloatPair items={mega[g.key]} lines={copyFor(g.title).lines} height={220} /> : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      <SideMenu open={menu} onClose={() => setMenu(false)} tree={menuTree} user={user} />
      <main style={{ minHeight: '60vh' }}><Outlet /></main>
      <SiteFooter groups={footGroups} />
    </SearchHintProvider>
  );
}

export default function Layout() { return <Shell lite={false} />; }
export function LiteLayout() { return <Shell lite />; }
