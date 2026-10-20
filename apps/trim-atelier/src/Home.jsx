import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE, SLIDES, SLIDE_MS } from './site.js';
import { SwipeLink } from './Swipe.jsx';

export default function Home() {
  const [k, setK] = useState(0);
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
        {SLIDES.map((s, i) => <div key={i} className={'th-sl' + (i === k ? ' on' : '')} style={{ background: s.img ? 'url(' + s.img + ') center/cover' : s.bg }} />)}
        <div className="wrap">
          <span className="th-eye">{SITE.heroEye}</span>
          <h1>{SITE.heroTitle}</h1>
          <p>{SITE.heroText}</p>
          <SwipeLink className="btn" to="/collection">Shop the collection</SwipeLink>
        </div>
        <div className="th-dots">{SLIDES.map((s, i) => <button key={i} type="button" aria-label={'Slide ' + (i + 1)} className={i === k ? 'on' : ''} onClick={() => setK(i)} />)}</div>
      </section>

      <section className="t-diff">
        <div className="l" />
        <div className="r">
          <h2>The TriM difference</h2>
          <div><h3>Carefully sourced</h3><p>Every piece is chosen by our team before it reaches the collection.</p></div>
          <div><h3>Beautifully presented</h3><p>Ready to give, and ready to wear.</p></div>
          <div><h3>Personal service</h3><p>Ask us anything on WhatsApp, from sizing to delivery.</p></div>
          <SwipeLink className="btn line" to="/collection">Explore</SwipeLink>
        </div>
      </section>

      <section className="wrap sec">
        <h2 className="t-h2">What our customers say</h2>
        <div className="t-rev">{SITE.reviews.map((r, i) => (
          <div key={i}><div className="st">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p>&ldquo;{r.t}&rdquo;</p><span className="muted">{r.by}{SITE.showSample ? ' (sample)' : ''}</span></div>
        ))}</div>
      </section>

      <section className="wrap sec sub">
        <p>Keep informed on new arrivals and private offers</p>
        <form onSubmit={subscribe}><input name="email" type="email" placeholder="Email Address" aria-label="Email address" /><button type="submit" aria-label="Subscribe">&rarr;</button></form>
      </section>
    </>
  );
}
