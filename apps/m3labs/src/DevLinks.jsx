import { DEV_LINKS } from './devLinks.js';

export default function DevLinks() {
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Links</h1>
      <p className="center muted">Direct buttons to your dashboards. Each opens in a new tab.</p>
      {DEV_LINKS.map((g) => (
        <section className="card" key={g.name}>
          <h2>{g.name}</h2>
          {g.items.map(([label, url, note]) => (
            <div className="mrow" key={url}>
              <span className="grow"><b>{label}</b><br /><span className="muted">{note}</span></span>
              <a className="btn" href={url} target="_blank" rel="noopener noreferrer">Open</a>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
