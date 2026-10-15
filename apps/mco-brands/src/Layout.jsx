import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Footer } from '@pyfon/ui';
import { img } from './api.js';
import { useCart } from './CartState.jsx';
import { useAuth, displayName } from './AuthState.jsx';
import { useCatalog } from './CatalogState.jsx';
import { buildGroups, showcase, priceText } from './groups.js';

export default function Layout() {
  const { cats, all } = useCatalog();
  const groups = useMemo(() => buildGroups(cats), [cats]);
  const [open, setOpen] = useState('');
  const [term, setTerm] = useState('');
  const [focus, setFocus] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { count } = useCart();
  const { user } = useAuth();

  useEffect(() => { setOpen(''); setFocus(false); }, [loc.pathname, loc.search]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') { setOpen(''); setFocus(false); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const suggestions = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return [];
    const catHits = cats.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 2)
      .map((c) => ({ key: 'c' + c.slug, label: c.name, note: 'Category', to: '/shop?category=' + c.slug }));
    const itemHits = all.filter((i) => i.name.toLowerCase().includes(q) || (Array.isArray(i.tags) && i.tags.some((t) => String(t).toLowerCase().includes(q)))).slice(0, 5)
      .map((i) => ({ key: i.sku, label: i.name, note: priceText(i), to: '/p/' + i.sku }));
    return [...catHits, ...itemHits];
  }, [term, cats, all]);

  function search(e) {
    e.preventDefault();
    nav('/shop?q=' + encodeURIComponent(term.trim()));
  }

  const right = (
    <div className="navright">
      <div className="searchbox">
        <form className="search" onSubmit={search}>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="Search products"
            aria-label="Search"
          />
          <select aria-label="Currency" defaultValue="KES"><option value="KES">KES</option></select>
        </form>
        {focus && suggestions.length ? (
          <ul className="suggest" onMouseDown={(e) => e.preventDefault()}>
            {suggestions.map((s) => (
              <li key={s.key}><Link to={s.to}><span>{s.label}</span><small>{s.note}</small></Link></li>
            ))}
          </ul>
        ) : null}
      </div>
      <Link to="/account">{user ? displayName(user).split(' ')[0] : 'Sign in'}</Link>
      <Link to="/cart">Cart ({count})</Link>
    </div>
  );

  const g = groups.find((x) => x.key === open);

  return (
    <>
      <div className="announce">Custom branding with your name, logo or photo. Order online, confirm on WhatsApp.</div>
      <Navbar brand="M & Co. Brands" links={[{ label: 'Shop all', href: '/shop' }, { label: 'Get a quote', href: '/quote' }]} right={right} />
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
          <div className="mega">
            <div className="wrap megain">
              <div className="megacats">
                <small>{g.title}</small>
                {g.cats.map((c) => (
                  <Link key={c.slug} to={'/shop?category=' + c.slug}>{c.name}<em>{c.itemCount}</em></Link>
                ))}
                <Link className="megaall" to={'/c/' + g.key}>View all {g.title}</Link>
              </div>
              <div className="megaitems">
                {showcase(g, all, 3).map((it) => (
                  <Link key={it.sku} className="megaitem" to={'/p/' + it.sku}>
                    <img src={img(it.image)} alt="" />
                    <span>{it.name}</span>
                    <strong>{priceText(it)}</strong>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <main style={{ minHeight: '60vh' }}><Outlet /></main>
      <Footer />
    </>
  );
}
