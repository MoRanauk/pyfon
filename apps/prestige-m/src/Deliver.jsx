import { Link, useParams } from 'react-router-dom';
import { formatKES } from '@pyfon/ui';
import { useCatalog } from './store.jsx';
import { useContent, wa } from './content.js';
import { CITIES } from './cities.js';
import { isAddon, tagVals } from './lib.js';
import { img } from './api.js';
import './deliver.css';

export default function Deliver() {
  const { slug } = useParams();
  const content = useContent();
  const { items } = useCatalog();
  const base = CITIES.find((c) => c.slug === slug);
  if (!base) return <div className="wrap sec center"><h1>Page not found</h1><Link to="/">Back to home</Link></div>;
  const c = { ...base, ...((content.cities || {})[slug] || {}) };
  const gifts = (items || [])
    .filter((i) => !isAddon(i))
    .filter((i) => slug === 'nairobi' || !tagVals(i, 'delivery').includes('nairobi'))
    .slice(0, 12);
  const price = (i) => (i.priceType === 'quote' || !i.priceKes ? 'Ask for a quote' : (i.priceType === 'from' ? 'From ' : '') + formatKES(i.priceKes));
  return (
    <div className="wrap">
      <div className="dl-crumb"><Link to="/">Home</Link> / <Link to="/deliver/zones">Deliver To</Link> / {base.name}</div>
      <section className="dl-hero"><h1>{c.title}</h1><p>{c.promise}</p></section>
      <div className="dl-facts">{c.facts.map((f) => <div key={f[0]}><b>{f[0]}</b>{f[1]}</div>)}</div>
      {slug === 'zones' ? (
        <div className="dl-towns">{CITIES.filter((x) => x.slug !== 'zones').map((x) => <Link key={x.slug} to={'/deliver/' + x.slug}>{x.name}</Link>)}</div>
      ) : (
        <div className="dl-grid">
          {gifts.map((i) => (
            <Link key={i.sku} className="dl-card" to={'/p/' + i.sku}>
              <img src={img(i.image)} alt="" loading="lazy" />
              <span>{i.name}</span><span>{price(i)}</span>
            </Link>
          ))}
        </div>
      )}
      <section className="dl-faq">
        <h2>Good to know</h2>
        {c.faq.map((q) => <div key={q[0]}><b>{q[0]}</b><p>{q[1]}</p></div>)}
      </section>
      <div className="dl-cta"><a href={wa(c.ask)} target="_blank" rel="noreferrer">Ask on WhatsApp</a></div>
    </div>
  );
}
