import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReviewsSection } from '@pyfon/ui';
import { STORE, API_URL, tokens } from './api.js';
import { SITE, SLIDES, SLIDE_MS } from './site.js';
import { SwipeLink } from './Swipe.jsx';
import { useSiteImages } from './siteImages.js';
import { TrimName } from './TrimName.jsx';

export default function Home() {
  const [k, setK] = useState(0);
  const IM = useSiteImages('trim');
  useEffect(() => {
    const t = setInterval(() => setK((n) => (n + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(t);
  }, []);
  function subscribe(e) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    const t = 'Hello ' + SITE.name + ', please add me to your updates.' + (email ? ' My email: ' + email : '');
    window.open('https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  }
  return (
    <>
      <section className="th-hero">
        {SLIDES.map((s, i) => <div key={i} className={'th-sl' + (i === k ? ' on' : '')} style={{ background: (IM['slide-' + (i + 1)] || s.img) ? 'url("' + (IM['slide-' + (i + 1)] || s.img) + '") center/cover' : s.bg }} />)}
        <div className="wrap">
          <span className="th-eye"><TrimName text={SITE.heroEye} /></span>
          <h1>{SITE.heroTitle}</h1>
          <p>{SITE.heroText}</p>
          <SwipeLink className="btn" to="/collection">Shop the collection</SwipeLink>
        </div>
        <div className="th-dots">{SLIDES.map((s, i) => <button key={i} type="button" aria-label={'Slide ' + (i + 1)} className={i === k ? 'on' : ''} onClick={() => setK(i)} />)}</div>
      </section>

      <section className="t-diff">
        <div className="l" style={IM.diff ? { background: 'url("' + IM.diff + '") center/cover' } : undefined} />
        <div className="r">
          <h2>The <TrimName text="TriM" /> difference</h2>
          <div><h3>Carefully sourced</h3><p>Every piece is chosen by our team before it reaches the collection.</p></div>
          <div><h3>Beautifully presented</h3><p>Ready to give, and ready to wear.</p></div>
          <div><h3>Personal service</h3><p>Ask us anything on WhatsApp, from sizing to delivery.</p></div>
          <SwipeLink className="btn line" to="/collection">Explore</SwipeLink>
        </div>
      </section>

      <section className="wrap sec">
        <h2 className="t-h2">What our customers say</h2>
        <ReviewsSection store={STORE} apiUrl={API_URL} getToken={() => tokens.get()} loginHref="/account" accent="#c9a14a" />
      </section>

      <section className="wrap sec sub">
        <p>Keep informed on new arrivals and private offers</p>
        <form onSubmit={subscribe}><input name="email" type="email" placeholder="Email Address" aria-label="Email address" /><button type="submit" aria-label="Subscribe">&rarr;</button></form>
      </section>
    </>
  );
}
