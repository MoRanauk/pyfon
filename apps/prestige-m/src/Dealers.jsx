import { useEffect, useState } from 'react';
import { api, img } from './api.js';

// "Featured dealers" strip on the home page. Shows nothing until a dealer is marked featured.
export default function DealerStrip() {
  const [list, setList] = useState([]);
  useEffect(() => {
    let live = true;
    api.get('/v1/dealers')
      .then((d) => { if (live) setList((d.dealers || []).filter((x) => x.featured)); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  if (!list.length) return null;
  return (
    <section className="section">
      <div className="wrap">
        <h2 className="ctr">Featured dealers</h2>
        <p className="muted ctr">Specialists we work with, so every job is made by people who do it best.</p>
        <div className="dealers">
          {list.map((d) => (
            <div className="dealer" key={d.name}>
              {d.image ? <img src={img(d.image)} alt="" loading="lazy" /> : <span className="dmark">{d.name.charAt(0)}</span>}
              <h3>{d.name}</h3>
              <small className="muted">{d.speciality}</small>
              {d.blurb ? <p>{d.blurb}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
