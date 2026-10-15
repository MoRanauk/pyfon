import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCart } from './CartState.jsx';
import { useAuth, displayName } from './AuthState.jsx';
import { useCatalog } from './CatalogState.jsx';
import { buildGroups, showcase } from './groups.js';
import { buildTree, copyFor } from './tree.js';
import { Announce, SearchBar, Burger, SearchIco, CartIco } from './Header.jsx';
import { SearchHintProvider } from './SearchHint.jsx';
import SideMenu from './SideMenu.jsx';
import SiteFooter from './SiteFooter.jsx';
import { FloatPair } from './FloatPair.jsx';

function Shell({ lite }) {
  const { cats, all } = useCatalog();
  const groups = useMemo(() => buildGroups(cats), [cats]);
  const tree = useMemo(() => buildTree(groups, all), [groups, all]);
  const [open, setOpen] = useState('');
  const [menu, setMenu] = useState(false);
  const [sOpen, setSOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(0);
  const loc = useLocation();
  const { count } = useCart();
  const { user } = useAuth();

  useEffect(() => { setOpen(''); setMenu(false); setSOpen(false); }, [loc.pathname, loc.search]);
  useEffect(() => {
    const f = () => setScrolled((prev) => (prev ? window.scrollY > 10 : window.scrollY > 60));
    const k = (e) => { if (e.key === 'Escape') { setOpen(''); setMenu(false); } };
    window.addEventListener('scroll', f, { passive: true });
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('keydown', k); };
  }, []);
  useEffect(() => { if (count) setBump((b) => b + 1); }, [count]);

  const g = groups.find((x) => x.key === open);
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
              {groups.map((gr) => (
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
                    {g.cats.map((c) => (
                      <Link key={c.slug} to={'/shop?category=' + c.slug}>{c.name}<em>{c.itemCount}</em></Link>
                    ))}
                    <Link className="megaall" to={'/c/' + g.key}>View all {g.title}</Link>
                  </div>
                  <FloatPair items={showcase(g, all, 8)} lines={copyFor(g.key).lines} height={220} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      <SideMenu open={menu} onClose={() => setMenu(false)} tree={tree} user={user} />
      <main style={{ minHeight: '60vh' }}><Outlet /></main>
      <SiteFooter groups={groups} />
    </SearchHintProvider>
  );
}

export default function Layout() { return <Shell lite={false} />; }
export function LiteLayout() { return <Shell lite />; }
