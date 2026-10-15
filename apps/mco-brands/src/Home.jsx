import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, Slider } from '@pyfon/ui';
import { api, STORE, img } from './api.js';
import { useCatalog } from './CatalogState.jsx';
import { mix, priceText } from './groups.js';
import { slugOf } from './tree.js';
import { Card, Section, Rail } from './Shared.jsx';

const COLORS = ['#e9d8a6', '#cfe0d4', '#f2c9c0', '#cdd8ee', '#f3d3a8', '#ddd0ee'];

export default function Home() {
  const { cats, all, tree, error } = useCatalog();
  // Groups shown as tiles and tabs (Explore and Co. Brand are not shopping ranges).
  const groups = useMemo(() => tree.filter((g) => g.title !== 'Explore' && g.title !== 'Co. Brand'), [tree]);
  const [tab, setTab] = useState('');
  const [tabItems, setTabItems] = useState([]);
  useEffect(() => { if (!tab && groups.length) setTab(groups[0].key); }, [groups, tab]);

  // Load 8 items for the chosen collection tab.
  useEffect(() => {
    const g = groups.find((x) => x.key === tab);
    if (!g) return undefined;
    let live = true;
    api.catalog.items(STORE, { node: slugOf(g), limit: 8 })
      .then((d) => { if (live) setTabItems(d.items); })
      .catch(() => { if (live) setTabItems([]); });
    return () => { live = false; };
  }, [tab, groups]);

  const d = useMemo(() => {
    const products = all.filter((i) => i.type === 'product' && i.image);
    const featured = products.filter((i) => i.featured);
    const rest = products.filter((i) => !i.featured);
    const dk = cats.find((c) => c.name.toLowerCase() === 'drinkware');
    const drinkItems = dk ? products.filter((i) => i.categorySlug === dk.slug) : [];
    return {
      hero: mix([...featured, ...rest], 7),
      featured: mix(featured, 12),
      picked: mix(rest, 10),
      drinkSlug: dk ? dk.slug : '',
      drink: drinkItems.find((i) => i.featured) || drinkItems[0] || null
    };
  }, [all, cats]);

  const intro = (
    <div className="hs">
      <small>M &amp; Co. Brands</small>
      <h1>Your name, your logo, your design. On everything.</h1>
      <p>Mugs, bags, hoodies, gifts and print jobs, made for you and branded the way you want.</p>
      <Link className="btn" to="/shop">Shop the range</Link>
      <Link className="btn alt" to="/quote">Request a quote</Link>
    </div>
  );

  const slides = d.hero.length
    ? d.hero.map((it, i) => ({
        image: img(it.image),
        node: i === 0 ? intro : (
          <div className="hs">
            <small>{it.category}</small>
            <h1>{it.name}</h1>
            <div className="price">{priceText(it)}</div>
            <Link className="btn" to={'/p/' + it.sku}>{it.priceType === 'quote' ? 'Ask for a quote' : 'Shop now'}</Link>
            <Link className="btn alt" to={'/shop?category=' + it.categorySlug}>More in {it.category}</Link>
          </div>
        )
      }))
    : [{ image: '', node: intro }];

  return (
    <>
      <div className="herowrap"><Slider slides={slides} /></div>

      {error ? <div className="wrap section"><p role="alert">Could not load the shop: {error}</p></div> : null}

      <Section title="Shop by range">
        <div className="gtiles">
          {groups.map((g, i) => (
            <Link key={g.key} className="ctile" style={{ background: COLORS[i % COLORS.length] }} to={'/c/' + g.key}>
              {g.image ? <img src={img(g.image)} alt="" loading="lazy" /> : null}
              <span className="pill">{g.title}</span>
            </Link>
          ))}
        </div>
      </Section>

      {d.featured.length ? (
        <Section title="Featured products" action={<Link to="/shop">See all</Link>}>
          <Rail>{d.featured.map((it) => <Card key={it.sku} it={it} />)}</Rail>
        </Section>
      ) : null}

      {d.drink ? (
        <section className="section" style={{ background: 'var(--pf-surface)' }}>
          <div className="wrap">
            <Reveal>
              <div className="story">
                <img src={img(d.drink.image)} alt={d.drink.name} />
                <div>
                  <p className="muted" style={{ margin: 0 }}>Drinkware</p>
                  <h2 style={{ fontFamily: 'var(--pf-font-heading)' }}>{d.drink.name}</h2>
                  <p>{d.drink.description}</p>
                  <p><strong>{priceText(d.drink)}</strong></p>
                  <Link className="btn" to={'/p/' + d.drink.sku}>View this piece</Link>
                  <Link to={'/shop?category=' + d.drinkSlug}>See all drinkware</Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="wrap">
          <Reveal>
            <div className="qband">
              <div>
                <h2>Printing, branding and signage for your business</h2>
                <p>Banners, uniforms, paperwork, vehicle branding. Tell us what you need and we quote fast.</p>
              </div>
              <Link className="btn" to="/quote">Get a quote</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {d.picked.length ? (
        <Section title="Picked for you" action={<Link to="/for-you">See more</Link>}>
          <Rail>{d.picked.map((it) => <Card key={it.sku} it={it} />)}</Rail>
        </Section>
      ) : null}

      <Section title="Collections">
        <div className="tabs">
          {groups.map((g) => (
            <button key={g.key} type="button" className={g.key === tab ? 'on' : ''} onClick={() => setTab(g.key)}>{g.title}</button>
          ))}
        </div>
        <div className="grid">{tabItems.map((it) => <Card key={it.sku} it={it} />)}</div>
      </Section>

      <section className="section">
        <div className="wrap">
          <Reveal>
            <div className="banner">
              <h2 style={{ marginTop: 0, fontFamily: 'var(--pf-font-heading)' }}>Create a free account</h2>
              <p className="muted">Track your orders and quote requests in one place.</p>
              <Link className="btn" to="/account">Sign up</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
