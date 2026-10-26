import { useCallback, useEffect, useRef, useState } from 'react';

const CSS = `
.rv{margin:0 auto;max-width:1100px;padding:8px 0;text-align:center;color:inherit}
.rv h2{font-weight:500;margin:0 0 6px}
.rv-sum{opacity:.7;font-size:14px;margin:0 0 14px}
.rv-wrap{display:flex;align-items:center;gap:8px}
.rv-box{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;flex:1;padding:4px 2px}
.rv-box::-webkit-scrollbar{display:none}
.rv-card{flex:0 0 min(340px,82%);scroll-snap-align:start;text-align:left;border:1px solid rgba(127,127,127,.3);border-radius:12px;padding:16px;background:rgba(127,127,127,.07)}
.rv-card p{margin:8px 0 12px;line-height:1.55}
.rv-st{color:var(--rv-a);letter-spacing:2px}
.rv-off{opacity:.25}
.rv-card footer{font-size:13px;opacity:.85}
.rv-v{margin-left:8px;font-size:11px;border:1px solid var(--rv-a);color:var(--rv-a);border-radius:20px;padding:1px 8px}
.rv-nav{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;cursor:pointer;font-size:18px}
.rv-form{max-width:520px;margin:18px auto 0;text-align:left}
.rv-open{display:block;margin:14px auto 0;padding:10px 20px;border-radius:24px;border:1px solid var(--rv-a);background:transparent;color:inherit;cursor:pointer;font:inherit}
.rv-pick{display:flex;gap:4px;margin:6px 0}
.rv-pick button{background:none;border:0;font-size:28px;cursor:pointer;color:rgba(127,127,127,.5);padding:0 2px}
.rv-pick button.on{color:var(--rv-a)}
.rv-form textarea{width:100%;box-sizing:border-box;min-height:100px;padding:10px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:inherit}
.rv-send{margin-top:10px;padding:10px 22px;border-radius:24px;border:0;background:var(--rv-a);color:#111;cursor:pointer;font:inherit;font-weight:600}
.rv-send:disabled{opacity:.5}
.rv-msg{margin:10px 0 0;text-align:center}
.rv-err{color:#c0262d}
`;

function Stars({ n }) {
  return <span className="rv-st" aria-label={n + ' out of 5'}>{'\u2605'.repeat(n)}<span className="rv-off">{'\u2605'.repeat(5 - n)}</span></span>;
}

function Row({ store, sku, apiUrl, emptyText, hover }) {
  const [data, setData] = useState(null);
  const box = useRef(null);
  useEffect(() => {
    let live = true;
    const none = { reviews: [], summary: { count: 0, avg: 0 } };
    setData(null);
    const q = sku ? '?sku=' + encodeURIComponent(sku) : '';
    fetch(apiUrl + '/v1/reviews/' + store + q, { headers: { 'X-Interface': store } })
      .then((r) => (r.ok ? r.json() : none))
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData(none); });
    return () => { live = false; };
  }, [store, sku, apiUrl]);
  const go = useCallback((dir) => {
    const el = box.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = card ? card.offsetWidth + 16 : el.clientWidth;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir < 0 && el.scrollLeft <= 4) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    else el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }, []);
  useEffect(() => {
    if (!data || data.reviews.length < 2) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => { if (!hover.current && !document.hidden) go(1); }, 18000);
    return () => clearInterval(t);
  }, [data, go, hover]);
  if (!data) return null;
  if (data.reviews.length === 0) return emptyText ? <p className="rv-sum">{emptyText}</p> : null;
  const many = data.reviews.length > 1;
  return (
    <div>
      <p className="rv-sum">{data.summary.avg} / 5 from {data.summary.count} {data.summary.count === 1 ? 'review' : 'reviews'}</p>
      <div className="rv-wrap">
        {many ? <button type="button" className="rv-nav" aria-label="Previous" onClick={() => go(-1)}>&larr;</button> : null}
        <div className="rv-box" ref={box}>
          {data.reviews.map((r) => (
            <article className="rv-card" key={r.id}>
              <Stars n={r.rating} />
              <p>{r.body}</p>
              <footer><b>{r.name}</b>{r.verified ? <span className="rv-v">Verified buyer</span> : null}</footer>
            </article>
          ))}
        </div>
        {many ? <button type="button" className="rv-nav" aria-label="Next" onClick={() => go(1)}>&rarr;</button> : null}
      </div>
    </div>
  );
}

function Form({ store, sku, apiUrl, getToken, loginHref }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  let token = '';
  try { token = getToken ? getToken() : ''; } catch (e) { token = ''; }
  async function send() {
    setErr(''); setMsg('');
    if (body.trim().length < 10) { setErr('Please write at least 10 characters.'); return; }
    setBusy(true);
    try {
      const r = await fetch(apiUrl + '/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Interface': store, Authorization: 'Bearer ' + token },
        body: JSON.stringify({ storefront: store, sku: sku || undefined, rating, body: body.trim() }),
      });
      let d = null;
      try { d = await r.json(); } catch (e) { d = null; }
      if (!r.ok) throw new Error((d && d.error && d.error.message) || 'Could not send (' + r.status + ')');
      setMsg((d && d.message) || 'Thank you!');
      setBody('');
      setOpen(false);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div>
      {msg ? <p className="rv-msg">{msg}</p> : null}
      {!token ? (
        <p className="rv-msg"><a href={loginHref} style={{ color: 'inherit' }}>Sign in to write a review</a></p>
      ) : !open ? (
        <button type="button" className="rv-open" onClick={() => { setOpen(true); setMsg(''); }}>Write a review</button>
      ) : (
        <div className="rv-form">
          <div className="rv-pick">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={n + ' stars'} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>{'\u2605'}</button>)}
          </div>
          <textarea maxLength={800} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us about your experience" />
          <button type="button" className="rv-send" disabled={busy} onClick={send}>{busy ? 'Sending...' : 'Send review'}</button>
          {err ? <p className="rv-msg rv-err">{err}</p> : null}
        </div>
      )}
      {!open && err ? <p className="rv-msg rv-err">{err}</p> : null}
    </div>
  );
}

// Reviews row + write form. Props: store (mco|prestige|trim), sku (optional), apiUrl, getToken, loginHref, title, accent, emptyText
export function ReviewsSection({ store, sku, apiUrl, getToken, loginHref, title, accent, emptyText }) {
  const hover = useRef(false);
  return (
    <section className="rv" style={{ '--rv-a': accent || '#c9a14a' }} onMouseEnter={() => { hover.current = true; }} onMouseLeave={() => { hover.current = false; }}>
      <style>{CSS}</style>
      {title ? <h2>{title}</h2> : null}
      <Row store={store} sku={sku} apiUrl={apiUrl} emptyText={emptyText} hover={hover} />
      <Form store={store} sku={sku} apiUrl={apiUrl} getToken={getToken} loginHref={loginHref || '/account'} />
    </section>
  );
}
