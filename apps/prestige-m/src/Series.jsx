import { Link } from 'react-router-dom';
import './jx.css';
import { img } from './api.js';
import { useCatalog } from './store.jsx';
import { isAddon, optionGroups, priceText } from './lib.js';
import { Rail } from './Bits.jsx';

// Edit these three lines to change the words on the page.
const INTRO = 'Make it yours. Names, dates and little messages, printed on mugs and bottles that get used every day.';
const TITLE = 'Personalised';
const BLURB = 'Pick a piece, add a name or a short message, and we print it for you. Mugs and bottles are our most loved gifts.';

function sizeOf(i) {
  const g = optionGroups(i.options).find((x) => /size|volume|capacity/i.test(x.name));
  if (g) return g.values[0];
  return (i.personalization || []).includes('text') ? 'Add a name' : '';
}

export default function Series() {
  const { items, ready } = useCatalog();
  const list = items.filter((i) => i.categorySlug === 'personalised' && !isAddon(i))
    .sort((a, b) => (/mug/i.test(b.subcategory || b.name) ? 1 : 0) - (/mug/i.test(a.subcategory || a.name) ? 1 : 0));
  return (
    <div>
      <div className="jx">
        <p style={{ fontSize: 18, margin: '10px 0 50px' }}>{INTRO}</p>
        {!list.length ? <p className="muted">{ready ? 'Nothing here yet.' : 'Loading...'}</p> : null}
        <div className="jx-grid3">
          {list.slice(0, 6).map((i) => (
            <Link key={i.sku} to={'/p/' + i.sku} className="jx-card">
              <img src={img(i.image)} alt="" />
              <div style={{ marginTop: 22 }}>{i.name}</div>
              <hr className="jx-rule" style={{ margin: '14px 0' }} />
              <div className="pr"><span>{priceText(i)}</span><span>{sizeOf(i)}</span></div>
            </Link>
          ))}
        </div>
      </div>
      {list.length ? <div className="jx-band" style={{ marginTop: 20 }}><div className="jx-bandin"><div><h2>{TITLE}</h2><p style={{ lineHeight: 1.8 }}>{BLURB}</p></div><Rail list={list} /></div></div> : null}
    </div>
  );
}
