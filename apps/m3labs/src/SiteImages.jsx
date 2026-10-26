import { useCallback, useEffect, useState } from 'react';
import { get, put, call, mediaUrl } from './http.js';

const B = '/v1/media/admin/site';
const SHOPS = [
  ['prestige', 'Pyfon Gift Hub', [['hero-her', 'Top picture of the home page (for her)'], ['hero-him', 'Top picture of the home page (for him)'], ['feature', 'Gift of the season panel']]],
  ['trim', 'TriM Atelier', [['slide-1', 'Home slide 1'], ['slide-2', 'Home slide 2'], ['slide-3', 'Home slide 3'], ['diff', 'The TriM difference panel']]],
];

export default function SiteImages() {
  const [shop, setShop] = useState('prestige');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { setD(await get(B + '/' + shop)); }, [shop]);
  useEffect(() => { setD(null); setErr(''); load().catch((e) => setErr(e.message)); }, [load]);

  async function act(fn, msg) {
    setErr(''); setOk(''); setBusy(true);
    try { await fn(); await load(); if (msg) setOk(msg); } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  function choose(slot, e) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const fd = new FormData();
    fd.append('file', f);
    act(() => put(B + '/' + shop + '/' + slot, fd), 'Picture saved. Reload the shop to see it.');
  }
  const slots = (SHOPS.find((s) => s[0] === shop) || SHOPS[0])[2];
  return (
    <div>
      <h1 className="center">Shop photos</h1>
      <p className="center muted">Choose the pictures that fill the coloured spaces on each shop's home page. Use large, clear JPG or WebP pictures, at least 1600 px wide and under 5 MB. A space with no picture keeps its colour.</p>
      {err ? <p className="err center">{err}</p> : null}
      {ok ? <p className="ok center">{ok}</p> : null}
      <div className="card">
        <label>Shop
          <select value={shop} onChange={(e) => setShop(e.target.value)}>
            {SHOPS.map((s) => <option key={s[0]} value={s[0]}>{s[1]}</option>)}
          </select>
        </label>
      </div>
      {!d ? <p className="center muted">Loading...</p> : null}
      {d ? slots.map(([slot, label]) => {
        const cur = d.images && d.images[slot];
        return (
          <div className="card" key={slot}>
            <h3>{label}</h3>
            {cur ? <img src={mediaUrl(cur.url)} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px', marginBottom: '8px' }} /> : <p className="muted">No picture yet.</p>}
            <label className="filebtn sm">{cur ? 'Replace picture' : 'Choose picture'}<input type="file" hidden accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => choose(slot, e)} /></label>
            {cur ? <button type="button" className="danger sm" disabled={busy} onClick={() => act(() => call('DELETE', B + '/' + shop + '/' + slot), 'Picture removed.')}>Remove</button> : null}
          </div>
        );
      }) : null}
    </div>
  );
}
