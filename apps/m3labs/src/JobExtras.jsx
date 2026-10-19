import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { P, fmt } from './api.js';
import { get, mediaUrl } from './http.js';

// Shown above the job: who the customer is, how to reach them, and the designs they chose.
function waLink(phone, text) {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '254' + n.slice(1);
  else if (/^[17]\d{8}$/.test(n)) n = '254' + n;
  return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(text) : '';
}

export default function JobExtras() {
  const { ref } = useParams();
  const [c, setC] = useState(null);
  const [designs, setDesigns] = useState([]);

  useEffect(() => {
    let live = true;
    setC(null); setDesigns([]);
    Promise.all([get(P + '/jobs/' + ref), get(P + '/catalog/jobs/' + ref + '/designs')])
      .then(([j, dz]) => {
        if (!live) return;
        const s = j.order || j.quote;
        setC(s ? { ref: s.ref, name: s.contactName, phone: s.contactPhone, email: s.contactEmail, company: s.companyName, notes: s.deliveryNotes || s.notes } : null);
        setDesigns(dz.designs || []);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [ref]);

  if (!c) return null;
  const wa = waLink(c.phone, 'Hello ' + (c.name || '') + ', this is Pyfon Brands about your ' + c.ref + '.');
  return (
    <>
      <section className="card">
        <h2>Customer</h2>
        <p><b>{c.name}</b>{c.company ? ' \u00b7 ' + c.company : ''}</p>
        <div className="mrow">
          {c.phone ? <a className="btnlink" href={'tel:' + c.phone}>Call {c.phone}</a> : null}
          {wa ? <a className="btnlink" href={wa} target="_blank" rel="noreferrer">WhatsApp</a> : null}
          {c.email ? <a className="btnlink" href={'mailto:' + c.email}>{c.email}</a> : null}
        </div>
        {c.notes ? <p className="muted">Notes: {c.notes}</p> : null}
      </section>
      {designs.length ? (
        <section className="card">
          <h2>Designs the customer chose</h2>
          {designs.map((x, i) => (
            <div className="mrow" key={i}>
              {x.designUrl ? <a href={mediaUrl(x.designUrl)} target="_blank" rel="noreferrer"><img className="thumb" src={mediaUrl(x.designUrl)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /></a> : null}
              <span className="grow">
                <b>{x.designName}</b> on {x.item} &times; {x.qty}<br />
                <span className="muted">{fmt(x.options)}{x.personalization ? ' \u00b7 ' + fmt(x.personalization) : ''}</span>
              </span>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}
