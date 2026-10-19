import { Footer } from '@pyfon/ui';
import { switchPortal } from './api.js';
import { ls } from './store.js';

const DESKS = [
  { key: 'creative', title: 'Creative Partner', blurb: 'Checks artwork and approves the mockup.' },
  { key: 'production', title: 'Production Partner', blurb: 'Assigns work in-house or to a dealer and tracks quality.' },
  { key: 'finance', title: 'Finance Partner', blurb: 'Quotes, payment, dispatch and delivery.' },
  { key: 'dev', title: 'Developer', blurb: 'System health, logs and technical support.' },
];

export default function Home() {
  const bg = ls.get('m3-bg', null);
  const style = bg ? { backgroundImage: 'linear-gradient(rgba(11,42,74,.55),rgba(11,42,74,.55)), url("' + bg + '")' } : undefined;
  return (
    <div className="choose" style={style}>
      <div className="choose-card">
        <div className="wordmark">M3 <b>Labs</b></div>
        <p className="muted">The Pyfon Brands partner workspace</p>
        <ol className="steps">
          <li className="on"><i>01</i>Choose your desk</li>
          <li><i>02</i>Sign in</li>
          <li><i>03</i>Start your day</li>
        </ol>
        <div className="boxes">
          {DESKS.map((d) => {
            const photo = ls.get('m3-photo-' + d.key, null);
            return (
              <button type="button" className="desk" key={d.key} onClick={() => switchPortal(d.key)}>
                <span className="passport">
                  {photo ? <img src={photo} alt="" /> : (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
                  )}
                </span>
                <b>{d.title}</b>
                <span className="blurb">{d.blurb}</span>
                <span className="go">Sign in</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: '18px' }}><Footer /></div>
    </div>
  );
}
