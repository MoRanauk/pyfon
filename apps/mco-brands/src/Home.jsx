import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatKES } from '@pyfon/ui';
import { api, img, STORE } from './api.js';
import { Card, Section } from './Shared.jsx';

export default function Home() {
  const [cats, setCats] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [picked, setPicked] = useState([]);
  const [tab, setTab] = useState('');
  const [tabItems, setTabItems] = useState([]);
  const [drink, setDrink] = useState(null);
  const [drinkSlug, setDrinkSlug] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.catalog.categories(STORE),
      api.catalog.items(STORE, { featured: 'true', limit: 12 }),
      api.catalog.items(STORE, { type: 'product', limit: 8, page: 2 })
    ])
      .then(([c, f, p]) => {
        setCats(c.categories);
        setFeatured(f.items);
        setPicked(p.items);
        if (c.categories.length) setTab(c.categories[0].slug);
        const dk = c.categories.find((x) => x.name.toLowerCase() === 'drinkware');
        if (dk) {
          setDrinkSlug(dk.slug);
          api.catalog.items(STORE, { category: dk.slug, featured: 'true', limit: 1 }).then((d) => setDrink(d.items[0] || null));
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!tab) return;
    api.catalog.items(STORE, { category: tab, limit: 8 }).then((d) => setTabItems(d.items)).catch(() => setTabItems([]));
  }, [tab]);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Your name, your logo, your design. On everything.</h1>
          <p>Mugs, bottles, notebooks, gifts and print jobs, made for you and branded the way you want.</p>
          <Link className="btn" to="/shop">Shop the range</Link>
          <Link className="btn alt" to="/shop?type=service">Request a quote</Link>
        </div>
      </section>

      <div className="wrap trust">
        <div><strong>&#128274; Secure ordering</strong><br /><span className="muted">Confirm every order with us on WhatsApp.</span></div>
        <div><strong>&#8617; Checked before dispatch</strong><br /><span className="muted">Each job is approved by our partners.</span></div>
        <div><strong>&#128172; Real support</strong><br /><span className="muted">Talk to a person about your design.</span></div>
      </div>

      {error ? <div className="wrap section"><p role="alert">Could not load the shop: {error}</p></div> : null}

      <Section title="Shop product range">
        <div className="tiles">
          {cats.map((c) => (
            <Link key={c.slug} className="tile" to={'/shop?category=' + c.slug}>
              <strong>{c.name}</strong>
              <small>{c.itemCount} items</small>
            </Link>
          ))}
        </div>
      </Section>

      {featured.length ? (
        <Section title="Featured products" action={<Link to="/shop">See all</Link>}>
          <div className="rail">{featured.map((it) => <Card key={it.sku} it={it} />)}</div>
        </Section>
      ) : null}

      {drink ? (
        <section className="section" style={{ background: 'var(--pf-surface)' }}>
          <div className="wrap story">
            <img src={img(drink.image)} alt={drink.name} />
            <div>
              <p className="muted" style={{ margin: 0 }}>Drinkware</p>
              <h2 style={{ fontFamily: 'var(--pf-font-heading)' }}>{drink.name}</h2>
              <p>{drink.description}</p>
              <p><strong>{drink.priceType === 'quote' ? 'Request a quote' : formatKES(drink.priceKes)}</strong></p>
              <Link className="btn" to={'/p/' + drink.sku}>View this piece</Link>
              <Link to={'/shop?category=' + drinkSlug}>See all drinkware</Link>
            </div>
          </div>
        </section>
      ) : null}

      {picked.length ? (
        <Section title="Picked for you">
          <div className="grid">{picked.map((it) => <Card key={it.sku} it={it} />)}</div>
        </Section>
      ) : null}

      <Section title="Collections">
        <div className="tabs">
          {cats.map((c) => (
            <button key={c.slug} type="button" className={c.slug === tab ? 'on' : ''} onClick={() => setTab(c.slug)}>{c.name}</button>
          ))}
        </div>
        <div className="grid">{tabItems.map((it) => <Card key={it.sku} it={it} />)}</div>
      </Section>

      <section className="section">
        <div className="wrap">
          <div className="banner">
            <h2 style={{ marginTop: 0, fontFamily: 'var(--pf-font-heading)' }}>Create a free account</h2>
            <p className="muted">Track your orders and quote requests in one place.</p>
            <Link className="btn" to="/account">Sign up</Link>
          </div>
        </div>
      </section>
    </>
  );
}
