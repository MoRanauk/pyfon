import { useEffect, useState } from 'react';
import { P, STAGE_LABEL } from './api.js';
import { get } from './http.js';
import { ls, waLink } from './store.js';

export default function Team() {
  const [team, setTeam] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { get(P + '/team').then((d) => setTeam(d.team || [])).catch((e) => setErr(e.message)); }, []);
  if (!team) return <p className="center">{err || 'Loading...'}</p>;
  return (
    <div>
      <h1 className="center">The three partners</h1>
      <p className="center muted">Tap Call to ring a partner from your phone. Messages between partners come in the next batch.</p>
      <div className="card">
        {team.map((m) => {
          const photo = ls.get('m3-photo-' + m.stage, null);
          return (
            <div className="mrow" key={m.id}>
              <span className="avatar" style={{ background: '#e3dfd2' }}>
                {photo ? <img src={photo} alt="" /> : <svg viewBox="0 0 24 24" fill="none" stroke="#9a937c" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>}
              </span>
              <span className="grow"><b>{m.fullName}</b><br /><span className="muted">{STAGE_LABEL[m.stage] || 'Partner'}{m.phone ? ' \u00b7 ' + m.phone : ' \u00b7 no number saved yet'}</span></span>
              {m.phone ? <a className="btnlink" href={'tel:' + m.phone}>Call</a> : null}
              {m.phone && waLink(m.phone) ? <a className="btnlink" href={waLink(m.phone)} target="_blank" rel="noreferrer">WhatsApp</a> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
