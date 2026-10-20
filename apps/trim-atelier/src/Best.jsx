import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from './store.jsx';
import { img } from './api.js';
import { optionGroups, priceText } from './lib.js';

export function Best({ item }) {
  const { add } = useCart();
  const groups = optionGroups(item.options);
  const [sel, setSel] = useState(() => Object.fromEntries(groups.map((g) => [g.name, g.values[0]])));
  const [ok, setOk] = useState(false);
  const can = item.type === 'product' && item.priceType === 'fixed' && item.priceKes != null && item.stockStatus !== 'out_of_stock';
  const to = '/p/' + encodeURIComponent(item.sku);
  return (
    <div className="t-best">
      <Link to={to}><div className="ph"><img src={img(item.image)} alt={item.name} loading="lazy" /></div><b>{item.name}</b></Link>
      <div className="pr">{priceText(item)}</div>
      {can ? groups.map((g) => (
        <select key={g.name} aria-label={g.name} value={sel[g.name]} onChange={(e) => setSel({ ...sel, [g.name]: e.target.value })}>
          {g.values.map((v) => <option key={v}>{v}</option>)}
        </select>
      )) : null}
      {can
        ? <button type="button" className="btn" onClick={() => { add(item, item.minOrderQty || 1, '', sel); setOk(true); setTimeout(() => setOk(false), 1800); }}>{ok ? 'Added' : 'Add to cart'}</button>
        : <Link className="btn line" to={to}>View details</Link>}
    </div>
  );
}
