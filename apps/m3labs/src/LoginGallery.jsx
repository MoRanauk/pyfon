import { useCallback, useEffect, useState } from 'react';
import { STAGE } from './api.js';
import { get, post, put, patch, call, mediaUrl } from './http.js';

const B = '/v1/media/admin';
const thumb = { width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', background: '#eee' };

export default function LoginGallery() {
  const [d, setD] = useState(null);
  const [cap, setCap] = useState('');
  const [file, setFile] = useState(null);
  const [fk, setFk] = useState(0);
  const [ad, setAd] = useState({ title: '', body: '', link: '' });
  const [adFile, setAdFile] = useState(null);
  const [afk, setAfk] = useState(0);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { setD(await get(B + '/login')); }, []);
  useEffect(() => { if (STAGE === 'dev') load().catch((e) => setErr(e.message)); }, [load]);

  async function act(fn, msg) {
    setErr(''); setOk(''); setBusy(true);
    try { await fn(); await load(); if (msg) setOk(msg); } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  if (STAGE !== 'dev') return <p className="center">The sign-in gallery is managed on the developer desk.</p>;

  const pics = d ? d.items.filter((x) => x.kind === 'image') : [];
  const ads = d ? d.items.filter((x) => x.kind === 'advert') : [];

  function addPicture() {
    act(async () => {
      if (!file) throw new Error('Choose a picture first.');
      const fd = new FormData();
      fd.append('kind', 'image');
      fd.append('caption', cap.trim());
      fd.append('file', file);
      await post(B + '/login', fd);
      setCap(''); setFile(null); setFk(fk + 1);
    }, 'Picture added. It joins the slideshow.');
  }
  function addAdvert() {
    act(async () => {
      if (!ad.title.trim() && !ad.body.trim()) throw new Error('Write a title or a message.');
      const fd = new FormData();
      fd.append('kind', 'advert');
      fd.append('title', ad.title.trim());
      fd.append('body', ad.body.trim());
      fd.append('link', ad.link.trim());
      if (adFile) fd.append('file', adFile);
      await post(B + '/login', fd);
      setAd({ title: '', body: '', link: '' }); setAdFile(null); setAfk(afk + 1);
    }, 'Advert added. Partners see it on the sign-in page.');
  }
  function move(i, dir) {
    const ids = pics.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act(() => put(B + '/login-order', { order: ids }), 'Order saved.');
  }
  function caption(x) {
    const n = window.prompt('Caption shown on the picture (leave empty for none)', x.caption || '');
    if (n === null) return;
    act(() => patch(B + '/login/' + x.id, { caption: n.trim() }), 'Caption saved.');
  }
  function remove(x) {
    if (!window.confirm('Remove this for good?')) return;
    act(() => call('DELETE', B + '/login/' + x.id), 'Removed.');
  }

  return (
    <div>
      <h1 className="center">Sign-in gallery</h1>
      <p className="center muted">These pictures fade slowly on the right of the M3 Labs sign-in page. Use large, clear JPG or WebP pictures, at least 1600 px wide and under 5 MB. Up to 12 pictures.</p>
      {err ? <p className="err center">{err}</p> : null}
      {ok ? <p className="ok center">{ok}</p> : null}

      <div className="card">
        <h2>Slideshow pictures</h2>
        {!d ? <p className="muted">Loading...</p> : null}
        {d && !pics.length ? <p className="muted">No pictures yet. The sign-in page shows its plain blue panel and a quote.</p> : null}
        {pics.map((x, i) => (
          <div className="mrow" key={x.id}>
            <img src={mediaUrl(x.url)} alt="" style={thumb} />
            <span className="grow"><b>{i + 1}.</b> {x.caption || <span className="muted">no caption</span>}{x.active ? '' : ' (hidden)'}</span>
            <button type="button" className="line sm" disabled={busy || i === 0} onClick={() => move(i, -1)}>Up</button>
            <button type="button" className="line sm" disabled={busy || i === pics.length - 1} onClick={() => move(i, 1)}>Down</button>
            <button type="button" className="line sm" disabled={busy} onClick={() => caption(x)}>Caption</button>
            <button type="button" className="line sm" disabled={busy} onClick={() => act(() => patch(B + '/login/' + x.id, { active: !x.active }), x.active ? 'Hidden from the slideshow.' : 'Shown again.')}>{x.active ? 'Hide' : 'Show'}</button>
            <button type="button" className="danger sm" disabled={busy} onClick={() => remove(x)}>Remove</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Add a picture</h2>
        <label>Picture (PNG, JPG or WebP)
          <input key={fk} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        <label>Caption (optional)<input value={cap} maxLength={120} onChange={(e) => setCap(e.target.value)} /></label>
        <button type="button" disabled={busy} onClick={addPicture}>{busy ? 'Please wait...' : 'Add picture'}</button>
      </div>

      <div className="card">
        <h2>Advert for partners</h2>
        <p className="muted">The newest advert that is switched on shows as a card on the sign-in page.</p>
        {ads.map((x) => (
          <div className="mrow" key={x.id}>
            {x.url ? <img src={mediaUrl(x.url)} alt="" style={thumb} /> : null}
            <span className="grow"><b>{x.title || '(no title)'}</b> {x.body}{x.active ? '' : ' (switched off)'}</span>
            <button type="button" className="line sm" disabled={busy} onClick={() => act(() => patch(B + '/login/' + x.id, { active: !x.active }), x.active ? 'Advert switched off.' : 'Advert switched on.')}>{x.active ? 'Switch off' : 'Switch on'}</button>
            <button type="button" className="danger sm" disabled={busy} onClick={() => remove(x)}>Remove</button>
          </div>
        ))}
        <label>Title<input value={ad.title} maxLength={80} onChange={(e) => setAd({ ...ad, title: e.target.value })} /></label>
        <label>Message<input value={ad.body} maxLength={300} onChange={(e) => setAd({ ...ad, body: e.target.value })} /></label>
        <label>Link (optional, starts with https://)<input value={ad.link} maxLength={300} onChange={(e) => setAd({ ...ad, link: e.target.value })} /></label>
        <label>Picture (optional)
          <input key={afk} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setAdFile(e.target.files[0] || null)} />
        </label>
        <button type="button" disabled={busy} onClick={addAdvert}>{busy ? 'Please wait...' : 'Post advert'}</button>
      </div>
    </div>
  );
}
