import { useEffect, useState } from 'react';
import { get } from './http.js';

export default function DevDbMap() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { get('/v1/dev/system/dbmap').then(setD).catch((e) => setErr(e.message)); }, []);
  const list = d ? d.tables.filter((t) => !q || t.name.includes(q.toLowerCase()) || t.columns.some((c) => c.name.includes(q.toLowerCase()))) : [];
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Database map</h1>
      <p className="center muted">Every table, its columns and how tables link together. Read live from the database. Row counts are approximate.</p>
      {err ? <p className="err center">{err}</p> : null}
      <p className="center"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a table or column" /></p>
      {!d ? <p className="center muted">Loading...</p> : <p className="center muted">{list.length} of {d.tables.length} tables</p>}
      {list.map((t) => (
        <section className="card" key={t.name}>
          <details open={!!q}>
            <summary><b>{t.name}</b> <span className="muted">&middot; {t.columns.length} columns &middot; about {t.rows} rows</span></summary>
            {t.links.length ? <p className="muted">Links: {t.links.join(', ')}</p> : null}
            {t.columns.map((c) => (
              <div className="mrow" key={c.name}><span className="grow">{c.name}</span><span className="muted">{c.type}{c.nullable ? '' : ' \u00b7 required'}</span></div>
            ))}
          </details>
        </section>
      ))}
    </div>
  );
}
