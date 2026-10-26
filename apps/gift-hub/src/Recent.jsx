import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from './CatalogState.jsx';
import { getRecent, clearRecent } from './recent.js';
import { Card } from './Shared.jsx';

// Products this visitor opened lately. Stored in the browser only.
export default function Recent() {
  const { all } = useCatalog();
  const [tick, setTick] = useState(0);
  const items = useMemo(() => {
    const by = new Map(all.map((i) => [i.sku, i]));
    return getRecent().map((s) => by.get(s)).filter(Boolean);
  }, [all, tick]);

  return (
    <div className="wrap section">
      <h2>Recently viewed</h2>
      {items.length ? (
        <>
          <div className="grid">{items.map((it) => <Card key={it.sku} it={it} />)}</div>
          <p><button type="button" className="linkbtn" onClick={() => { clearRecent(); setTick(tick + 1); }}>Clear this list</button></p>
        </>
      ) : (
        <p className="muted">Nothing here yet. Products you open will show up here. <Link to="/shop">Start shopping</Link></p>
      )}
    </div>
  );
}
