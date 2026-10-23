import { useEffect, useState } from 'react';
import { api } from './api.js';

const SHOPS = [['prestige', 'Gift shop'], ['trim', 'TriM Atelier'], ['mco', 'M & Co. Brands'], ['studio', 'Studio']];
const D = '/v1/dev/theme/';
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const isColourKey = (k) => k !== '--pf-font' && k !== '--pf-radius';
const six = (v) => (/^#[0-9a-fA-F]{3}$/.test(v) ? '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : HEX.test(v) ? v : '#000000');

export default function ThemeManager() {
  const [shop, setShop] = useState('prestige');
  const [theme, setTheme] = useState({});
  const [known, setKnown] = useState({});
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(D + 'tokens').then((d) => setKnown(d.tokens || {})).catch(() => {}); }, []);
  useEffect(() => {
    setErr(''); setMsg('');
    api.get(D + shop).then((d) => setTheme(d.theme || {})).catch((e) => setErr(e.message));
  }, [shop]);

  const setVal = (k, v) => setTheme((t) => ({ ...t, [k]: v }));
  const drop = (k) => setTheme((t) => { const n = { ...t }; delete n[k]; return n; });
  const defaultFor = (k) => { const kv = known[k]; return isColourKey(k) ? (HEX.test(kv || '') ? kv : '#000000') : (kv || ''); };

  function add() {
    const k = name.trim();
    if (!/^--pf-[a-z0-9-]{1,40}$/.test(k)) return setErr('Token names look like --pf-gold (lowercase letters, digits, dashes).');
    setErr(''); setVal(k, defaultFor(k)); setName('');
  }
  function fill() {
    setTheme((t) => { const n = { ...t }; Object.keys(known).forEach((k) => { if (!(k in n)) n[k] = defaultFor(k); }); return n; });
  }
  async function save() {
    setErr(''); setMsg('');
    const clean = {};
    for (const [k, v] of Object.entries(theme)) {
      const s = String(v).trim();
      if (!s) continue;
      if (isColourKey(k) && !HEX.test(s)) return setErr(k + ' must be a colour like #1a2b3c.');
      clean[k] = s;
    }
    setBusy(true);
    try { await api.post(D + shop, { theme: clean }); setTheme(clean); setMsg('Saved. Shops pick it up within a minute.'); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function reset() {
    setErr(''); setMsg(''); setBusy(true);
    try { await api.post(D + shop + '/reset', {}); setTheme({}); setMsg('Reset. The shop uses its built-in theme again.'); } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const keys = Object.keys(theme).sort();
  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 className="center">Theme manager</h1>
      <p className="muted center">Colours, font and corner radius for each shop. Developer only.</p>
      {msg ? <p className="ok center">{msg}</p> : null}
      {err ? <p className="err center">{err}</p> : null}
      <section className="card">
        <label>Shop <select value={shop} onChange={(e) => setShop(e.target.value)}>{SHOPS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
        {Object.keys(known).length ? <p><button type="button" className="btn sm" onClick={fill}>Fill with the shop defaults</button> <span className="muted">Adds every token found in packages/theme.</span></p> : <p className="muted">Token names could not be read from packages/theme, so add them by hand.</p>}
        {keys.length === 0 ? <p className="muted">No custom theme saved for this shop. It uses its built-in colours.</p> : null}
        {keys.map((k) => (
          <div className="row" key={k}>
            <span className="grow"><b>{k}</b></span>
            {isColourKey(k) ? <input type="color" value={six(theme[k])} onChange={(e) => setVal(k, e.target.value)} /> : null}
            <input style={{ width: isColourKey(k) ? 110 : 220 }} value={theme[k]} onChange={(e) => setVal(k, e.target.value)} placeholder={k === '--pf-radius' ? '12px' : k === '--pf-font' ? "'Georgia', serif" : '#1a2b3c'} />
            <button type="button" className="btn sm danger" onClick={() => drop(k)}>Remove</button>
          </div>
        ))}
        <div className="row">
          <input className="grow" list="tm-names" placeholder="Add a token, for example --pf-gold" value={name} onChange={(e) => setName(e.target.value)} />
          <datalist id="tm-names">{Object.keys(known).map((k) => <option key={k} value={k} />)}</datalist>
          <button type="button" className="btn sm" onClick={add}>Add</button>
        </div>
        <div className="actbar">
          <button type="button" className="btn" disabled={busy} onClick={save}>Save theme</button>
          <button type="button" className="btn danger" disabled={busy} onClick={reset}>Reset to built-in</button>
        </div>
      </section>
    </div>
  );
}
