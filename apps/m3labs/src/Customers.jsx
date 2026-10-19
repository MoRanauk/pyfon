import { useEffect, useState } from 'react';
import { P } from './api.js';
import { get } from './http.js';
import { waLink } from './store.js';

export default function Customers() {
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { get(P + '/customers').then((d) => setList(d.customers || [])).catch((e) => setErr(e.message)); }, []);
  if (!list) return <p className="center">{err || 'Loading...'}</p>;
  const needle = q.trim().toLowerCase();
  const shown = list.filter((c) => !needle || [c.name, c.phone, c.email, c.ref].join(' ').toLowerCase().includes(needle));
  return (
    <div>
      <h1 className="center">Customers</h1>
      <p className="center muted">Everyone who has ordered or asked for a quote. Two-way chat inside the app comes in the next batch; for now use Call or WhatsApp.</p>
      <div className="card">
        <input placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} />
        {!shown.length ? <p className="muted">No customers found.</p> : null}
        {shown.map((c) => (
          <div className="mrow" key={c.phone + c.ref}>
            <span className="grow"><b>{c.name}</b><br /><span className="muted">{c.phone} &middot; last: {c.ref}</span></span>
            <a className="btnlink" href={'tel:' + c.phone}>Call</a>
            {waLink(c.phone) ? <a className="btnlink" href={waLink(c.phone, 'Hello ' + c.name + ', this is Pyfon Brands.')} target="_blank" rel="noreferrer">WhatsApp</a> : null}
            {c.email ? <a className="btnlink" href={'mailto:' + c.email}>Email</a> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
