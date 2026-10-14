import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatKES } from '@pyfon/ui';
import { api, img, STORE } from './api.js';

const STOCK = { in_stock: 'In stock', made_to_order: 'Made to order', out_of_stock: 'Out of stock' };

export default function Product() {
  const { sku } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');
  const [main, setMain] = useState('');

  useEffect(() => {
    setItem(null);
    setError('');
    api.catalog.item(STORE, sku).then((d) => { setItem(d.item); setMain(d.item.image); }).catch((e) => setError(e.message));
  }, [sku]);

  if (error) return <div className="wrap section"><p role="alert">{error}</p><Link to="/shop">Back to shop</Link></div>;
  if (!item) return <div className="wrap section"><p className="muted">Loading...</p></div>;

  let price = 'Request a quote';
  if (item.priceType === 'fixed' && item.priceKes != null) price = formatKES(item.priceKes);
  if (item.priceType === 'from' && item.priceKes != null) price = 'From ' + formatKES(item.priceKes);
  const pers = (item.personalization || []).filter((p) => p !== 'none');

  return (
    <div className="wrap section">
      <p><Link to="/shop">Shop</Link> / <Link to={'/shop?category=' + item.categorySlug}>{item.category}</Link></p>
      <div className="story">
        <div>
          <img src={img(main)} alt={item.name} />
          {item.images.length > 1 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {item.images.map((p) => (
                <img key={p} src={img(p)} alt="" style={{ width: 64, cursor: 'pointer' }} onClick={() => setMain(p)} />
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--pf-font-heading)', marginTop: 0 }}>{item.name}</h1>
          <p style={{ fontSize: 22, margin: '0 0 8px' }}>
            <strong>{price}</strong>
            {item.compareAtPriceKes != null && item.priceType !== 'quote' ? (
              <span className="muted" style={{ marginLeft: 10, fontSize: 16, textDecoration: 'line-through' }}>{formatKES(item.compareAtPriceKes)}</span>
            ) : null}
          </p>
          <p>{item.description}</p>
          <ul className="muted">
            <li>{STOCK[item.stockStatus] || item.stockStatus}{item.leadTimeDays ? ', about ' + item.leadTimeDays + ' days' : ''}</li>
            {item.minOrderQty > 1 ? <li>Minimum order: {item.minOrderQty}</li> : null}
            {pers.length ? <li>Personalise with: {pers.join(', ')}</li> : null}
          </ul>
          <p className="muted">Ordering opens in the next step.</p>
        </div>
      </div>
    </div>
  );
}
