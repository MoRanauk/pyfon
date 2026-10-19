import { useCallback, useEffect, useState } from 'react';
import { P, STAGE } from './api.js';
import { get, post, put, patch, mediaUrl } from './http.js';

const V = (STAGE === 'dev' ? '/v1/dev' : P) + '/videos';
const MAX_VID = 20 * 1024 * 1024;

export default function Videos() {
  const [shops, setShops] = useState(['mco', 'prestige', 'trim']);
  const [shop, setShop] = useState('mco');
  const [d, setD] = useState(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setD(await get(V + '?storefront=' + encodeURIComponent(shop)));
  }, [shop]);

  useEffect(() => { get(P + '/catalog/storefronts').then((x) => { if (x.storefronts && x.storefronts.length) setShops(x.storefronts); }).catch(() => {}); }, []);
  useEffect(() => { setD(null); load().catch((e) => setErr(e.message)); }, [load]);

  async function act(fn, okMsg) {
    setErr(''); setOk(''); setBusy(true);
    try { await fn(); await load(); if (okMsg) setOk(okMsg); } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  function add() {
    act(async () => {
      if (title.trim().length < 2) throw new Error('Give the video a title.');
      if (file) {
        if (file.size > MAX_VID) throw new Error('Video is over 20 MB. Compress it or make it shorter.');
        const fd = new FormData();
        fd.append('title', title.trim());
        fd.append('storefront', shop);
        fd.append('file', file);
        await post(V, fd);
      } else {
        if (!/^https:\/\//.test(link.trim())) throw new Error('Choose a video file, or paste a link ending in .mp4 or .webm');
        await post(V, { url: link.trim(), title: title.trim(), storefront: shop });
      }
      setTitle(''); setFile(null); setLink(''); setFileKey(fileKey + 1);
    }, 'Video added.');
  }

  function move(i, dir) {
    const ids = d.current.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act(() => put(V + '/order', { storefront: shop, order: ids }), 'Order saved.');
  }
  function replace(id, e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    act(async () => {
      if (f.size > MAX_VID) throw new Error('Video is over 20 MB. Compress it or make it shorter.');
      const fd = new FormData();
      fd.append('file', f);
      await post(V + '/' + id + '/replace', fd);
    }, 'Video replaced. The old one is in the archive.');
  }
  function rename(v) {
    const n = window.prompt('Video title', v.title);
    if (n === null || n.trim().length < 2) return;
    act(() => patch(V + '/' + v.id, { title: n.trim() }), 'Title changed.');
  }
  function remove(id) {
    const reason = window.prompt('Why are you removing this video? (optional, it goes to the archive)');
    if (reason === null) return;
    act(() => post(V + '/' + id + '/archive', { reason: reason.trim() || undefined }), 'Video moved to the archive.');
  }

  const player = (v) => (
    <video src={mediaUrl(v.url)} poster={v.poster ? mediaUrl(v.poster) : undefined} controls muted playsInline preload="none" style={{ width: '100%', maxWidth: '320px', borderRadius: '8px', background: '#000' }} />
  );

  return (
    <div>
      <h1 className="center">Home page videos</h1>
      <p className="center muted">Up to 5 per shop. They play one after another in a small window on the shop's home page.</p>
      {err ? <p className="err center">{err}</p> : null}
      {ok ? <p className="ok center">{ok}</p> : null}
      <div className="card">
        <label>Shop
          <select value={shop} onChange={(e) => { setErr(''); setOk(''); setShop(e.target.value); }}>
            {shops.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="card">
        <h2>Playing now</h2>
        {!d ? <p className="muted">Loading...</p> : null}
        {d && !d.current.length ? <p className="muted">No videos for this shop yet.</p> : null}
        {d ? d.current.map((v, i) => (
          <div className="mrow" key={v.id}>
            {player(v)}
            <span className="grow"><b>{i + 1}. {v.title}</b></span>
            <button type="button" className="line sm" disabled={busy || i === 0} onClick={() => move(i, -1)}>Up</button>
            <button type="button" className="line sm" disabled={busy || i === d.current.length - 1} onClick={() => move(i, 1)}>Down</button>
            <button type="button" className="line sm" disabled={busy} onClick={() => rename(v)}>Rename</button>
            <label className="filebtn sm">Replace<input type="file" hidden accept="video/mp4,video/webm" disabled={busy} onChange={(e) => replace(v.id, e)} /></label>
            <button type="button" className="danger sm" disabled={busy} onClick={() => remove(v.id)}>Remove</button>
          </div>
        )) : null}
      </div>

      <div className="card">
        <h2>Add a video</h2>
        <label>Title<input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Video file (MP4 or WebM, max 20 MB)
          <input key={fileKey} type="file" accept="video/mp4,video/webm" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        <label>or a direct link ending in .mp4 or .webm<input placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} /></label>
        <button type="button" disabled={busy} onClick={add}>{busy ? 'Please wait...' : 'Add video'}</button>
      </div>

      {d && d.archive.length ? (
        <div className="card">
          <h2>Archive</h2>
          {d.archive.map((v) => (
            <div className="mrow" key={v.id}>
              {player(v)}
              <span className="grow muted">{v.title} &middot; {v.archiveReason || 'Removed'}{v.archivedBy ? ' by ' + v.archivedBy : ''}</span>
              <button type="button" className="line sm" disabled={busy} onClick={() => act(() => post(V + '/' + v.id + '/restore', {}), 'Video restored.')}>Restore</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
