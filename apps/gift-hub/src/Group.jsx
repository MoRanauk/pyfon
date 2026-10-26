import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, STORE, img } from './api.js';
import { useCatalog } from './CatalogState.jsx';
import { mix } from './groups.js';
import { copyFor, findByKey, kids, slugOf } from './tree.js';
import { Card, Section, Rail } from './Shared.jsx';

const COLORS = ['#e9d8a6', '#cfe0d4', '#f2c9c0', '#cdd8ee', '#f3d3a8', '#ddd0ee'];
const tagsOf = (i) => (Array.isArray(i.tags) ? i.tags.map((t) => String(t).trim()).filter(Boolean) : []);

const ICON = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

// Three small trust notes. Shown on landing pages only.
function Trust() {
  return (
    <section className="section">
      <div className="wrap tbar">
        <div><svg {...ICON}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg><p><b>Safe ordering</b><span>Your details stay private.</span></p></div>
        <div><svg {...ICON}><path d="M4 8h11a5 5 0 0 1 0 10H8" /><path d="M8 4L4 8l4 4" /></svg><p><b>Returns help</b><span>Tell us if something is not right.</span></p></div>
        <div><svg {...ICON}><path d="M4 5h16v11H9l-5 4z" /></svg><p><b>Real people on WhatsApp</b><span>Ask us anything before you order.</span></p></div>
      </div>
    </section>
  );
}

export default function Group() {
  const { key } = useParams();
  const { tree, ready } = useCatalog();
  const nav = useNavigate();
  const node = findByKey(tree, key);
  const [items, setItems] = useState(null);
  const [theme, setTheme] = useState('');

  useEffect(() => { setTheme(''); }, [key]);

  // Load up to 60 items of this group (used for theme tabs and the rails).
  useEffect(() => {
    if (!node) return undefined;
    let live = true;
    setItems(null);
    api.catalog.items(STORE, { node: slugOf(node), limit: 60 })
      .then((d) => { if (live) setItems(d.items); })
      .catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [node]);

  // "Shop by theme" tabs come from the most used tags.
  const themes = useMemo(() => {
    const c = {};
    (items || []).forEach((i) => tagsOf(i).forEach((t) => { c[t] = (c[t] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
  }, [items]);
  const themed = useMemo(() => (items || []).filter((i) => !theme || tagsOf(i).includes(theme)).slice(0, 8), [items, theme]);
  const look = useMemo(() => mix(items || [], 12), [items]);

  if (!ready) return <div className="wrap section"><p className="muted">Loading...</p></div>;
  if (!node) {
    return (
      <div className="wrap section">
        <h2>Page not found</h2>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  const list = kids(node);
  const copy = copyFor(node.title);
  const idx = Math.max(0, tree.findIndex((g) => g.key === node.key));
  const color = COLORS[idx % COLORS.length];

  return (
    <>
      <div className="wrap">
        <div className="gbanner" style={{ background: color }}>
          <div>
            <h1>{node.title}</h1>
            <p>{copy.blurb}</p>
          </div>
          {list.length ? (
            <label className="gdrop">
              Browse {node.title}
              <select value="" onChange={(e) => { if (e.target.value) nav(e.target.value); }}>
                <option value="">Choose...</option>
                {list.map((n) => <option key={n.key} value={n.to}>{n.title}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {list.length ? (
        <section className="section">
          <div className="wrap">
            <div className="gtiles">
              {list.map((n, i) => (
                <Link key={n.key} className="ctile" to={n.to}>
                  {n.image
                    ? <img src={img(n.image)} alt="" loading="lazy" />
                    : <span className="noimg" style={{ background: COLORS[i % COLORS.length] }} />}
                  <span className="pill">{n.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {items && items.length ? (
        <Section title="Shop by theme">
          {themes.length ? (
            <div className="tabs">
              <button type="button" className={theme ? '' : 'on'} onClick={() => setTheme('')}>All</button>
              {themes.map((t) => (
                <button key={t} type="button" className={t === theme ? 'on' : ''} onClick={() => setTheme(t)}>{t}</button>
              ))}
            </div>
          ) : null}
          <div className="grid">{themed.map((it) => <Card key={it.sku} it={it} />)}</div>
        </Section>
      ) : null}

      {look.length ? (
        <Section title="Shop the look" action={<Link to={node.to}>See all</Link>}>
          <Rail>{look.map((it) => <Card key={it.sku} it={it} />)}</Rail>
        </Section>
      ) : null}

      <section className="section">
        <div className="wrap">
          <p className="gtext">
            Everything in {node.title} can carry your name, logo or photo. Send us your idea, we check the artwork,
            make a mockup for your approval, then print. Not sure what you need? Request a quote and we come back quickly.
          </p>
        </div>
      </section>

      <Trust />
    </>
  );
}
