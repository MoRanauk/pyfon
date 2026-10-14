import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, STORE } from './api.js';
import { Card } from './Shared.jsx';

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const category = sp.get('category') || '';
  const q = sp.get('q') || '';
  const type = sp.get('type') || '';
  const page = Number(sp.get('page') || 1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    api.catalog.items(STORE, { category, q, type, page, limit: 24 }).then(setData).catch((e) => setError(e.message));
  }, [category, q, type, page]);

  function go(p) {
    const next = new URLSearchParams(sp);
    next.set('page', String(p));
    setSp(next);
    window.scrollTo(0, 0);
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const heading = q ? 'Results for "' + q + '"' : type === 'service' ? 'Print and design services' : category ? 'Shop: ' + category : 'All products and services';

  return (
    <div className="wrap section">
      <h2>{heading}</h2>
      {error ? <p role="alert">Could not load items: {error}</p> : null}
      {!data && !error ? <p className="muted">Loading...</p> : null}
      {data && !data.items.length ? <p className="muted">Nothing found. Try another search.</p> : null}
      {data ? <div className="grid">{data.items.map((it) => <Card key={it.sku} it={it} />)}</div> : null}
      {data && pages > 1 ? (
        <div className="pager">
          <button type="button" disabled={page <= 1} onClick={() => go(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => go(page + 1)}>Next</button>
        </div>
      ) : null}
    </div>
  );
}
