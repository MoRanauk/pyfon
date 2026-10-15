import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCatalog } from './CatalogState.jsx';
import { priceText } from './groups.js';
import { useSearchHint } from './SearchHint.jsx';

const still = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Burger = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
);
export const SearchIco = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
export const CartIco = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="9.5" cy="19" r="1.4" fill="currentColor" /><circle cx="17" cy="19" r="1.4" fill="currentColor" /></svg>
);

const MESSAGES = [
  'Custom branding with your name, logo or photo.',
  'Order online, confirm on WhatsApp.',
  'Printing, signage and design for your business.'
];

// Rotating one-line announcements.
export function Announce() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (still()) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % MESSAGES.length), 4200);
    return () => clearInterval(t);
  }, []);
  return <div className="announce"><span key={i} className="ann">{MESSAGES[i]}</span></div>;
}

const IDEAS = ['Hoodies with your logo', 'A mug with their name on it', 'Posters for your wall', 'Gifts that feel personal', 'Banners for your business', 'Uniforms for your team'];
const COLORS = ['#ff5a7a', '#1aa39a', '#7a5cff', '#d98e04', '#2f80ed', '#e0357b'];

// Types a phrase, erases it, then moves to the next one.
function useTyping(phrases, paused) {
  const [state, setState] = useState({ text: '', idx: 0 });
  const key = phrases.join('|');
  useEffect(() => {
    if (!phrases.length) return undefined;
    if (still()) { setState({ text: phrases[0], idx: 0 }); return undefined; }
    if (paused) return undefined;
    let i = 0;
    let n = 0;
    let dir = 1;
    let timer;
    const tick = () => {
      const p = phrases[i % phrases.length];
      n += dir;
      setState({ text: p.slice(0, n), idx: i });
      let wait = dir > 0 ? 70 : 35;
      if (dir > 0 && n >= p.length) { dir = -1; wait = 1500; }
      else if (dir < 0 && n <= 0) { dir = 1; i += 1; wait = 400; }
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [key, paused]);
  return state;
}

// The big search bar with a glowing colour ring and a typing placeholder.
export function SearchBar() {
  const { cats, all } = useCatalog();
  const { hint, clear } = useSearchHint();
  const nav = useNavigate();
  const loc = useLocation();
  const [term, setTerm] = useState('');
  const [focus, setFocus] = useState(false);
  const phrases = hint.name ? [hint.name, hint.category ? 'More ' + hint.category.toLowerCase() : 'Similar items'] : IDEAS;
  const t = useTyping(phrases, focus || term.length > 0);

  useEffect(() => { setTerm(''); setFocus(false); }, [loc.pathname, loc.search]);

  const suggestions = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return [];
    const catHits = cats.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 2)
      .map((c) => ({ key: 'c' + c.slug, label: c.name, note: 'Category', to: '/shop?category=' + c.slug }));
    const itemHits = all.filter((i) => i.name.toLowerCase().includes(q) || (Array.isArray(i.tags) && i.tags.some((x) => String(x).toLowerCase().includes(q)))).slice(0, 5)
      .map((i) => ({ key: i.sku, label: i.name, note: priceText(i), to: '/p/' + i.sku }));
    return [...catHits, ...itemHits];
  }, [term, cats, all]);

  function submit(e) {
    e.preventDefault();
    const q = term.trim();
    if (q) nav('/shop?q=' + encodeURIComponent(q));
  }

  return (
    <div className="searchwrap">
      <form className="glow" onSubmit={submit}>
        <div className="sbar">
          {hint.category ? (
            <span className="schip">{hint.category}<button type="button" aria-label="Clear" onClick={clear}>&times;</button></span>
          ) : null}
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder={focus ? 'Search products' : t.text + '|'}
            style={{ '--tc': COLORS[t.idx % COLORS.length] }}
            aria-label="Search"
          />
          <button type="submit" className="sgo" aria-label="Search"><SearchIco /></button>
        </div>
      </form>
      {focus && suggestions.length ? (
        <ul className="suggest" onMouseDown={(e) => e.preventDefault()}>
          {suggestions.map((s) => (
            <li key={s.key}><Link to={s.to}><span>{s.label}</span><small>{s.note}</small></Link></li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
