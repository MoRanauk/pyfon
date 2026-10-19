import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, nameOf } from './Auth.jsx';
import { STAGE_LABEL, STAGE } from './api.js';
import { ls, photoKey, resizeImage } from './store.js';

export default function Settings() {
  const { user, logout } = useAuth();
  const [photo, setPhoto] = useState(() => ls.get(photoKey(user), null));
  const [inspire, setInspire] = useState(() => ls.get('m3-inspire', null));
  const [bg, setBg] = useState(() => ls.get('m3-bg', null));
  const [mins, setMins] = useState(() => ls.get('m3-focus-min', 25));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function pick(e, name, w, h, setter) {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setMsg('');
    try {
      const url = await resizeImage(f, w, h, 0.8);
      if (!ls.set(name, url)) throw new Error('Not enough space on this device. Try a smaller picture.');
      setter(url); setMsg('Saved on this device.');
    } catch (x) { setErr(x.message); }
  }
  function clear(name, setter) { ls.del(name); setter(null); setMsg('Removed.'); }

  const slot = (title, hint, value, name, w, h, setter, wide) => (
    <section className="card">
      <h2>{title}</h2>
      <p className="muted">{hint}</p>
      {value ? <img src={value} alt="" style={wide ? { width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '10px' } : { width: '96px', height: '120px', objectFit: 'cover', borderRadius: '10px' }} /> : <p className="muted">Nothing chosen yet.</p>}
      <div className="mrow">
        <label className="filebtn">Choose a picture<input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(e, name, w, h, setter)} /></label>
        {value ? <button type="button" className="line" onClick={() => clear(name, setter)}>Remove</button> : null}
      </div>
    </section>
  );

  return (
    <div>
      <h1 className="center">Settings</h1>
      <p className="center muted">{nameOf(user)} &middot; {STAGE_LABEL[STAGE]} desk</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}
      {slot('Your passport photo', 'Shown on the front door and in the side menu. Kept on this device for now.', photo, photoKey(user), 360, 450, setPhoto, false)}
      {slot('Picture on the sign-in page', 'Fills the right half of the sign-in page. Choose something that inspires the team.', inspire, 'm3-inspire', 1400, 1000, setInspire, true)}
      {slot('Front door background', 'The picture behind the four desk boxes.', bg, 'm3-bg', 1600, 1000, setBg, true)}
      <section className="card">
        <h2>Focus timer</h2>
        <label>Default length
          <select value={mins} onChange={(e) => { const n = Number(e.target.value); setMins(n); ls.set('m3-focus-min', n); }}>
            {[15, 25, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
      </section>
      <section className="card">
        <h2>Account</h2>
        <div className="mrow"><Link className="btnlink" to="/password">Change password</Link><button type="button" className="danger" onClick={logout}>Sign out</button></div>
      </section>
    </div>
  );
}
