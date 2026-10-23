import { Link, useLocation } from 'react-router-dom';
import './jx.css';
import { img } from './api.js';
import { useCatalog } from './store.jsx';
import { isAddon, tagVals } from './lib.js';
import { Rail } from './Bits.jsx';
import Sub from './Sub.jsx';
import { PTREE, pto } from './personalised.js';

// Edit these three lines to change the words on the page.
const INTRO = 'Make it yours. Names, dates and little messages, printed on gifts that get used every day.';
const TITLE = 'Personalised';
const BLURB = 'Pick a piece, add a name or a short message, and we print it for you.';

function Landing() {
  const { items, ready } = useCatalog();
  const mine = items.filter((i) => i.categorySlug === 'personalised' && !isAddon(i));
  const real = mine.filter((i) => !(i.tags || []).includes('placeholder'));
  return (
    <div>
      <div className="jx">
        <p style={{ fontSize: 18, margin: '10px 0 50px' }}>{INTRO}</p>
        {!mine.length ? <p className="muted">{ready ? 'Nothing here yet.' : 'Loading...'}</p> : null}
        <div className="jx-grid3">
          {PTREE.map((g) => { const f = mine.find((i) => tagVals(i, 'node').includes(g.n) && i.image); return (
            <Link key={g.n} to={pto(g.n)} className="jx-card">
              {f ? <img src={img(f.image)} alt="" /> : null}
              <div style={{ marginTop: 22 }}>{g.t}</div>
              <hr className="jx-rule" style={{ margin: '14px 0' }} />
              <div className="pr"><span>{g.k.length ? g.k.map((k) => k.t).slice(0, 3).join(', ') : 'Design it with us'}</span></div>
            </Link>
          ); })}
        </div>
      </div>
      {real.length ? <div className="jx-band" style={{ marginTop: 20 }}><div className="jx-bandin"><div><h2>{TITLE}</h2><p style={{ lineHeight: 1.8 }}>{BLURB}</p></div><Rail list={real} /></div></div> : null}
    </div>
  );
}

export default function Series() {
  const loc = useLocation();
  return new URLSearchParams(loc.search).get('node') ? <Sub /> : <Landing />;
}
