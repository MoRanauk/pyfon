import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { get, put, post } from './http.js';

const env = import.meta.env;
const SHOPS = [
  { code: 'prestige', name: 'Pyfon Gift Hub', note: 'Gift shop', url: env.VITE_SHOP_PRESTIGE_URL || 'http://localhost:5175', pages: ['/', '/c/flowers', '/c/hampers', '/c/sweets', '/c/personalised', '/c/occasions', '/c/gifts-for', '/shop', '/deliver/nairobi', '/deliver/zones', '/cart'] },
  { code: 'trim', name: 'TriM Atelier', note: 'Luxury boutique', url: env.VITE_SHOP_TRIM_URL || 'http://localhost:5176', pages: ['/', '/collection', '/cart'] },
  { code: 'mco', name: 'M & Co. Brands', note: 'Marketplace', url: env.VITE_SHOP_MCO_URL || 'http://localhost:5173', pages: ['/'] },
  { code: 'studio', name: 'Studio', note: 'Blank frontend to build on', url: env.VITE_SHOP_STUDIO_URL || 'http://localhost:5177', pages: ['/', '/about', '/contact'] },
];
const MODS = [['Basic', [['heading', 'Heading', 'H'], ['text', 'Text', 'T'], ['button', 'Button', 'B'], ['image', 'Image', 'I'], ['quote', 'Quote', 'Q']]], ['Layout', [['banner', 'Banner', 'Bn'], ['columns', 'Columns', '3C'], ['gallery', 'Gallery', 'G'], ['spacer', 'Spacer', 'Sp'], ['divider', 'Divider', 'Dv']]], ['Media', [['video', 'Video', 'V']]]];
const KINDS = MODS.flatMap((g) => g[1].map((x) => x[0]));
const FIELDS = {
  heading: [['text', 'Text']], text: [['text', 'Text', 'area']], button: [['label', 'Label'], ['link', 'Link (/c/flowers or https://...)']],
  image: [['url', 'Image link']], quote: [['text', 'Quote', 'area'], ['by', 'Name']],
  columns: [['c1', 'Column 1', 'area'], ['c2', 'Column 2', 'area'], ['c3', 'Column 3', 'area']],
  gallery: [['urls', 'Image links, one per line', 'area']], banner: [['title', 'Headline'], ['text', 'Text', 'area'], ['label', 'Button label'], ['link', 'Button link']],
  video: [['url', 'YouTube or .mp4 link']], spacer: [], divider: [],
};
const DEVS = ['phone', 'tablet', 'desktop'];
const ANIMS = [['', 'None'], ['fade', 'Fade in'], ['up', 'Slide up'], ['zoom', 'Zoom in']];
const FONTS = [['', 'Shop default'], ['Georgia, serif', 'Georgia (serif)'], ["'Trebuchet MS', sans-serif", 'Trebuchet'], ['Verdana, sans-serif', 'Verdana'], ["'Palatino Linotype', serif", 'Palatino'], ["'Courier New', monospace", 'Courier']];
const EMPTY = { theme: {}, words: {}, navOrder: [], ann: '', layout: {}, blocks: {}, components: {}, pages: {}, css: '' };
const WIDTH = { desktop: '100%', tablet: 768, phone: 390 };
const rid = () => Math.random().toString(36).slice(2, 8);
const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v || '');
const pretty = (n) => n.replace(/^--pf-/, '').replace(/-/g, ' ');
const pageName = (p) => (p === '/' ? 'Home' : p.replace(/^\//, '').replace(/[\/-]/g, ' '));
const empty = (v) => v === '' || (v && typeof v === 'object' && !Object.keys(v).length);
const clean = (o) => {
  if (Array.isArray(o)) return o.map(clean).filter((x) => !empty(x));
  if (o && typeof o === 'object') { const r = {}; Object.keys(o).forEach((k) => { const v = clean(o[k]); if (!empty(v)) r[k] = v; }); return r; }
  return typeof o === 'string' ? o.trim() : o;
};
const fromData = (d) => ({ theme: d.theme || {}, words: d.words || {}, navOrder: d.navOrder || [], ann: (d.announce || []).join('\n'), layout: d.layout || {}, blocks: d.blocks || {}, components: d.components || {}, pages: d.pages || {}, css: d.customCss || '' });
const toData = (d) => clean({ announce: d.ann.split('\n').map((s) => s.trim()).filter(Boolean), theme: d.theme, words: d.words, navOrder: d.navOrder, layout: d.layout, blocks: d.blocks, components: d.components, pages: d.pages, customCss: d.css });
const lay = (d, p, patch) => ({ ...d, layout: { ...d.layout, [p]: { ...(d.layout[p] || {}), ...patch } } });
const laySub = (d, p, f, k, v) => lay(d, p, { [f]: { ...((d.layout[p] || {})[f] || {}), [k]: v } });
const upBlock = (d, p, id, patch) => ({ ...d, blocks: { ...d.blocks, [p]: (d.blocks[p] || []).map((b) => (b.id === id ? { ...b, ...patch } : b)) } });

const CSS = `.sb{display:flex;flex-direction:column;height:calc(100vh - 110px);min-height:560px;background:#eef1f6;border:1px solid #d5dbe5;border-radius:10px;overflow:hidden;font-size:13px;color:#1c2536}
.sb button,.sb select,.sb input,.sb textarea{font:inherit}
.sb-top{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#1b2538;color:#fff;flex-wrap:wrap}
.sb-b{background:transparent;border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:6px;padding:6px 10px;cursor:pointer}.sb-b:disabled{opacity:.35;cursor:default}
.sb-pri{background:#2d7ff9;border:0;color:#fff;border-radius:6px;padding:7px 16px;font-weight:700;cursor:pointer}.sb-pri:disabled{opacity:.5;cursor:default}
.sb-seg{display:inline-flex;border:1px solid rgba(255,255,255,.3);border-radius:6px;overflow:hidden}.sb-seg button{background:transparent;border:0;color:#fff;padding:6px 11px;cursor:pointer}.sb-seg button.on{background:#2d7ff9}
.sb-sp{flex:1}.sb-st{opacity:.8;font-size:12px}
.sb-main{flex:1;display:flex;min-height:0}
.sb-side{width:350px;flex:none;background:#fff;border-right:1px solid #d5dbe5;display:flex;flex-direction:column;min-height:0}
.sb-tabs{display:flex;border-bottom:1px solid #d5dbe5;overflow-x:auto}.sb-tabs button{flex:1 0 auto;background:none;border:0;border-bottom:3px solid transparent;padding:11px 10px;cursor:pointer;font-weight:600;color:#5b6679}.sb-tabs button.on{color:#2d7ff9;border-color:#2d7ff9}
.sb-body{flex:1;overflow:auto;padding:12px}
.sb-h{font-weight:700;margin:14px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5b6679}
.sb-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sb-tile{border:1px solid #d5dbe5;border-radius:8px;padding:12px 4px;text-align:center;cursor:grab;background:#f8fafc;user-select:none}.sb-tile:hover{border-color:#2d7ff9;background:#eef5ff}.sb-tile b{display:block;font-size:17px;color:#2d7ff9;margin-bottom:4px}
.sb-row{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #d5dbe5;border-radius:8px;background:#fff;margin-bottom:6px;cursor:grab}.sb-row.sb-drag{opacity:.4;border-color:#2d7ff9}.sb-row.sb-sel{border-color:#2d7ff9;background:#eef5ff}
.sb-grip{color:#9aa5b8}.sb-lbl{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
.sb-mini{border:1px solid #d5dbe5;background:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px}
.sb-card{border:1px solid #2d7ff9;background:#f4f8ff;border-radius:10px;padding:10px;margin-bottom:12px}.sb-card.cmp{border-color:#8a5bb5;background:#f8f4fc}
.sb-in{width:100%;box-sizing:border-box;padding:7px;border:1px solid #c5cddb;border-radius:6px;margin:3px 0 8px}
.sb-canvas{flex:1;min-width:0;position:relative;display:flex;justify-content:center;padding:14px;overflow:auto}
.sb-frame{height:100%;min-height:480px;background:#fff;border-radius:8px;box-shadow:0 6px 30px rgba(20,30,50,.18);overflow:hidden;transition:width .25s;max-width:100%}.sb-frame iframe{width:100%;height:100%;border:0}
.sb-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.sb-ov div{background:#fff;padding:14px 20px;border-radius:10px;box-shadow:0 6px 30px rgba(0,0,0,.2);max-width:360px;text-align:center}
.sb-clr{display:flex;align-items:center;gap:8px;margin-bottom:8px}.sb-clr span{flex:1}.sb-clr input[type=color]{width:36px;height:28px;border:0;padding:0;background:none}
.sb-muted{color:#6b7689;font-size:12px}.sb-err{color:#c0262d}.sb-ok{color:#1b7f4b}.sb-chk{display:inline-flex;align-items:center;gap:4px;margin-right:10px}
@media(max-width:900px){.sb-main{flex-direction:column}.sb-side{width:auto;max-height:46%}}`;

function DragList({ rows, onReorder, selKey }) {
  const [drag, setDrag] = useState(null);
  const ref = useRef(null);
  const tops = useRef({});
  useLayoutEffect(() => {
    const els = ref.current ? [...ref.current.children] : [];
    const now = els.map((e) => e.getBoundingClientRect().top);
    els.forEach((e, i) => {
      const old = tops.current[e.dataset.k];
      if (old != null && old !== now[i]) {
        e.style.transition = 'none'; e.style.transform = 'translateY(' + (old - now[i]) + 'px)';
        e.getBoundingClientRect();
        e.style.transition = 'transform .2s'; e.style.transform = '';
      }
      tops.current[e.dataset.k] = now[i];
    });
  });
  const over = (k) => (e) => {
    e.preventDefault();
    if (!drag || drag === k) return;
    const keys = rows.map((r) => r.k);
    const a = keys.indexOf(drag);
    const b = keys.indexOf(k);
    if (a < 0 || b < 0) return;
    keys.splice(a, 1);
    keys.splice(b, 0, drag);
    onReorder(keys);
  };
  return (
    <div ref={ref}>
      {rows.map((r) => (
        <div key={r.k} data-k={r.k} draggable className={'sb-row' + (drag === r.k ? ' sb-drag' : '') + (selKey === r.k ? ' sb-sel' : '')}
          onDragStart={(e) => { setDrag(r.k); try { e.dataTransfer.setData('text/plain', 'row'); } catch (x) { /* ignore */ } }}
          onDragOver={over(r.k)} onDragEnd={() => setDrag(null)}>
          <span className="sb-grip">&#8942;&#8942;</span>{r.el}
        </div>
      ))}
    </div>
  );
}

function Fields({ v, set, idk }) {
  return (
    <>
      {(FIELDS[v.type] || []).map((f) => (
        <label key={f[0]}>{f[1]}
          {f[2] === 'area'
            ? <textarea rows="3" className="sb-in" maxLength={600} value={v[f[0]] || ''} onChange={(e) => set({ [f[0]]: e.target.value }, idk + f[0])} />
            : <input type="text" className="sb-in" list={f[0] === 'link' ? 'sb-links' : undefined} maxLength={600} value={v[f[0]] || ''} onChange={(e) => set({ [f[0]]: e.target.value }, idk + f[0])} />}
        </label>
      ))}
      {v.type === 'spacer' ? <label>Height {v.height || 60}px<input type="range" min="10" max="300" style={{ width: '100%' }} value={v.height || 60} onChange={(e) => set({ height: +e.target.value }, idk + 'h')} /></label> : null}
      {v.type === 'banner' ? (
        <div className="sb-clr"><span>Banner colour</span>
          <input type="color" value={isHex(v.bg) ? v.bg : '#3a2630'} onChange={(e) => set({ bg: e.target.value }, idk + 'bg')} />
        </div>
      ) : null}
    </>
  );
}

function Builder({ shop, onBack }) {
  const fr = useRef(null);
  const docRef = useRef(EMPTY);
  const past = useRef([]);
  const future = useRef([]);
  const lastC = useRef({ k: '', t: 0 });
  const itemsRef = useRef([]);
  const pathRef = useRef('/');
  const saveRef = useRef(null);
  const [doc, setDoc] = useState(EMPTY);
  const [rest, setRest] = useState({});
  const [savedStr, setSavedStr] = useState('');
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [late, setLate] = useState(false);
  const [view, setView] = useState('edit');
  const [dev, setDev] = useState('desktop');
  const [tab, setTab] = useState('add');
  const [vars, setVars] = useState({});
  const [titles, setTitles] = useState([]);
  const [items, setItems] = useState([]);
  const [path, setPath] = useState('/');
  const [sel, setSel] = useState(null);
  const [hist, setHist] = useState(null);
  const [src, setSrc] = useState(shop.url + '/?edit=1');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const origin = new URL(shop.url).origin;
  const U = '/v1/dev/content/' + shop.code;

  function commit(fn, key) {
    const d = docRef.current;
    const n = fn(d);
    if (n === d) return;
    const now = Date.now();
    if (!(key && lastC.current.k === key && now - lastC.current.t < 700)) { past.current.push(d); if (past.current.length > 80) past.current.shift(); }
    lastC.current = { k: key || '', t: now };
    future.current = [];
    docRef.current = n;
    setDoc(n);
  }
  function jump(from, to) {
    if (!from.current.length) return;
    to.current.push(docRef.current);
    const n = from.current.pop();
    docRef.current = n;
    setDoc(n);
  }
  const undo = () => jump(past, future);
  const redo = () => jump(future, past);
  function fill(d) {
    const nd = fromData(d);
    docRef.current = nd; past.current = []; future.current = [];
    setDoc(nd);
    setRest({ home: d.home, msg: d.msg, ctx: d.ctx, cities: d.cities });
    setSavedStr(JSON.stringify(toData(nd)));
  }
  const send = (m) => { if (fr.current && fr.current.contentWindow) fr.current.contentWindow.postMessage({ pf: 1, ...m }, origin); };
  const toggleHide = (p, key) => commit((d) => { const h = (d.layout[p] || {}).hidden || []; return lay(d, p, { hidden: h.includes(key) ? h.filter((x) => x !== key) : [...h, key] }); });
  function addBlock(kind, index) {
    const p = pathRef.current;
    const id = rid();
    let b;
    if (kind && kind.startsWith('cmp:')) {
      if (!docRef.current.components[kind.slice(4)]) return;
      b = { id, type: 'component', ref: kind.slice(4) };
    } else {
      if (!KINDS.includes(kind)) return;
      b = kind === 'spacer' ? { id, type: kind, height: 60 } : { id, type: kind };
    }
    const keys = itemsRef.current.map((i) => i.key);
    keys.splice(index == null ? keys.length : Math.min(index, keys.length), 0, 'blk:' + id);
    commit((d) => ({ ...lay(d, p, { order: keys }), blocks: { ...d.blocks, [p]: [...(d.blocks[p] || []), b] } }));
    setTimeout(() => send({ type: 'pick', key: 'blk:' + id }), 300);
  }
  function removeBlock(p, id) {
    commit((d) => {
      const c = d.layout[p] || {};
      return { ...lay(d, p, { order: (c.order || []).filter((k) => k !== 'blk:' + id), hidden: (c.hidden || []).filter((k) => k !== 'blk:' + id) }), blocks: { ...d.blocks, [p]: (d.blocks[p] || []).filter((b) => b.id !== id) } };
    });
    setSel(null);
  }
  function dupBlock(p, b) {
    const id = rid();
    const keys = itemsRef.current.map((i) => i.key);
    const at = keys.indexOf('blk:' + b.id);
    keys.splice(at < 0 ? keys.length : at + 1, 0, 'blk:' + id);
    commit((d) => ({ ...lay(d, p, { order: keys }), blocks: { ...d.blocks, [p]: [...(d.blocks[p] || []), { ...b, id }] } }));
  }
  function makePart(p, b) {
    const cid = 'c' + rid();
    const { id, ...rest2 } = b;
    commit((d) => ({
      ...d,
      components: { ...d.components, [cid]: { ...rest2, cname: 'Part ' + (Object.keys(d.components).length + 1) } },
      blocks: { ...d.blocks, [p]: d.blocks[p].map((x) => (x.id === b.id ? { id: b.id, type: 'component', ref: cid } : x)) },
    }));
  }
  function detach(p, b) {
    const m = docRef.current.components[b.ref];
    if (!m) return;
    const { cname, ...fields } = m;
    commit((d) => ({ ...d, blocks: { ...d.blocks, [p]: d.blocks[p].map((x) => (x.id === b.id ? { ...fields, id: b.id } : x)) } }));
  }
  const setMaster = (cid, patch, key) => commit((d) => ({ ...d, components: { ...d.components, [cid]: { ...d.components[cid], ...patch } } }), key);
  const usage = (cid) => Object.values(doc.blocks).flat().filter((b) => b.ref === cid).length;

  useEffect(() => {
    get(U).then((r) => { fill(r.data || {}); setLoaded(true); }).catch((e) => setErr(e.message));
    const t = setTimeout(() => setLate(true), 7000);
    return () => clearTimeout(t);
  }, [U]);
  useEffect(() => {
    const h = (e) => {
      const m = e.data;
      if (e.origin !== origin || !m || m.pf !== 1) return;
      if (m.type === 'ready') { setReady(true); setVars((v) => (Object.keys(v).length ? v : m.vars || {})); setTitles(m.titles || []); }
      if (m.type === 'layout') { itemsRef.current = m.items; pathRef.current = m.path; setItems(m.items); setPath(m.path); }
      if (m.type === 'words') commit((d) => ({ ...d, words: m.words || {} }));
      if (m.type === 'nav') commit((d) => ({ ...d, navOrder: m.order || [] }), 'nav');
      if (m.type === 'order') commit((d) => lay(d, m.path, { order: m.order }), 'order');
      if (m.type === 'toggle') toggleHide(m.path, m.key);
      if (m.type === 'remove') removeBlock(m.path, m.id);
      if (m.type === 'blockText') commit((d) => (m.ref ? { ...d, components: { ...d.components, [m.ref]: { ...d.components[m.ref], [m.field]: m.value } } } : upBlock(d, m.path, m.id, { [m.field]: m.value })));
      if (m.type === 'select') setSel(m.key ? { path: m.path, key: m.key, bid: m.bid, ref: m.ref } : null);
      if (m.type === 'drop') addBlock(m.kind, m.index);
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [origin]);
  useEffect(() => {
    const k = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 's') { e.preventDefault(); if (saveRef.current) saveRef.current(false); return; }
      if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'z') { e.preventDefault(); undo(); }
      if (e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => {
    if (ready && loaded) send({ type: 'set', theme: doc.theme, words: doc.words, navOrder: doc.navOrder, layout: doc.layout, blocks: doc.blocks, components: doc.components, pages: doc.pages, customCss: doc.css, announce: doc.ann.split('\n').map((s) => s.trim()).filter(Boolean) });
  }, [ready, loaded, doc]);
  useEffect(() => { if (ready) send({ type: 'mode', mode: view === 'edit' ? 'edit' : 'browse' }); }, [ready, view]);

  async function save(reset) {
    setMsg(''); setErr('');
    try {
      const r = await put(U, { data: reset ? {} : { ...clean(rest), ...toData(docRef.current) } });
      fill(r.data || {});
      setMsg(reset ? 'Back to the built-in design.' : 'Saved. The shop shows it within a minute.');
      setHist(null);
    } catch (e) { setErr(e.message); }
  }
  saveRef.current = save;
  const loadHist = () => get(U + '/history').then((r) => setHist(r.history || [])).catch((e) => setErr(e.message));
  const restore = async (id) => {
    if (!window.confirm('Restore this version? It becomes the live design.')) return;
    try { const r = await post(U + '/restore/' + id, {}); fill(r.data || {}); setMsg('Restored.'); loadHist(); } catch (e) { setErr(e.message); }
  };
  const download = () => {
    const b = new Blob([JSON.stringify({ ...clean(rest), ...toData(doc) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = shop.code + '-design.json'; a.click();
  };
  const importFile = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    f.text().then((t) => {
      try { const d = JSON.parse(t); if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('x'); commit(() => fromData(d)); setMsg('Imported. Press Save to publish it.'); setErr(''); }
      catch (x) { setErr('That file is not a design export.'); }
    });
  };

  const dirty = loaded && JSON.stringify(toData(doc)) !== savedStr;
  const cfg = doc.layout[path] || {};
  const block = sel && sel.bid ? (doc.blocks[path] || []).find((b) => b.id === sel.bid) : null;
  const master = block && block.type === 'component' ? doc.components[block.ref] : null;
  const curItem = sel ? items.find((i) => i.key === sel.key) : null;
  const colours = Object.keys(vars).filter((k) => isHex(vars[k]));
  const menu = doc.navOrder.length ? doc.navOrder.filter((t) => titles.includes(t)).concat(titles.filter((t) => !doc.navOrder.includes(t))) : titles;
  const words = Object.keys(doc.words);
  const seo = doc.pages[path] || {};
  const radius = parseInt(doc.theme['--pf-radius'] || '', 10);
  const move = (dir) => {
    const keys = items.map((i) => i.key);
    const i = keys.indexOf(sel.key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    commit((d) => lay(d, path, { order: keys }));
  };
  const setTheme = (k, v) => commit((d) => ({ ...d, theme: { ...d.theme, [k]: v } }), 't' + k);
  const clearTheme = (k) => commit((d) => { const t = { ...d.theme }; delete t[k]; return { ...d, theme: t }; });
  const devOf = (k) => ((cfg.dev || {})[k] || []);
  const side = view !== 'preview';

  return (
    <div className="sb">
      <style>{CSS}</style>
      <datalist id="sb-links">{shop.pages.map((p) => <option key={p} value={p} />)}</datalist>
      <div className="sb-top">
        <button type="button" className="sb-b" onClick={() => { if (!dirty || window.confirm('Leave without saving?')) onBack(); }}>&larr; Shops</button>
        <b>{shop.name}</b>
        <select className="sb-b" value={shop.pages.includes(path) ? path : ''} onChange={(e) => { if (e.target.value) { setReady(false); setSel(null); setSrc(shop.url + e.target.value + '?edit=1'); } }}>
          {!shop.pages.includes(path) ? <option value="">{path}</option> : null}
          {shop.pages.map((p) => <option key={p} value={p} style={{ color: '#000' }}>{pageName(p)}</option>)}
        </select>
        <span className="sb-sp" />
        <div className="sb-seg">{['desktop', 'tablet', 'phone'].map((x) => <button type="button" key={x} className={dev === x ? 'on' : ''} onClick={() => setDev(x)}>{x[0].toUpperCase() + x.slice(1)}</button>)}</div>
        <button type="button" className="sb-b" disabled={!past.current.length} onClick={undo}>Undo</button>
        <button type="button" className="sb-b" disabled={!future.current.length} onClick={redo}>Redo</button>
        <div className="sb-seg">{[['edit', 'Edit'], ['browse', 'Browse'], ['preview', 'Preview']].map((x) => <button type="button" key={x[0]} className={view === x[0] ? 'on' : ''} onClick={() => setView(x[0])}>{x[1]}</button>)}</div>
        <span className="sb-st">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        <button type="button" className="sb-pri" disabled={!dirty} onClick={() => save(false)}>Save</button>
      </div>
      {msg || err ? <div style={{ padding: '6px 12px', background: '#fff' }} className={err ? 'sb-err' : 'sb-ok'}>{err || msg}</div> : null}
      <div className="sb-main">
        {side ? (
          <aside className="sb-side">
            <div className="sb-tabs">{[['add', 'Add'], ['page', 'Page'], ['menu', 'Menu'], ['style', 'Style'], ['parts', 'Parts'], ['more', 'More']].map((x) => <button type="button" key={x[0]} className={tab === x[0] ? 'on' : ''} onClick={() => { setTab(x[0]); if (x[0] === 'more' && !hist) loadHist(); }}>{x[1]}</button>)}</div>
            <div className="sb-body">
              {sel && curItem ? (
                <div className={'sb-card' + (master ? ' cmp' : '')}>
                  <b>{master ? 'Linked part: ' + (master.cname || 'Part') + ' (used ' + usage(block.ref) + 'x)' : block ? 'Block: ' + block.type : 'Section: ' + curItem.label}</b>
                  <p style={{ margin: '8px 0' }}>
                    <button type="button" className="sb-mini" onClick={() => move(-1)}>Up</button>{' '}
                    <button type="button" className="sb-mini" onClick={() => move(1)}>Down</button>{' '}
                    <button type="button" className="sb-mini" onClick={() => toggleHide(path, sel.key)}>{curItem.hidden ? 'Show' : 'Hide'}</button>{' '}
                    {block ? <button type="button" className="sb-mini" onClick={() => dupBlock(path, block)}>Duplicate</button> : null}{' '}
                    {block ? <button type="button" className="sb-mini" onClick={() => removeBlock(path, block.id)}>Delete</button> : null}
                  </p>
                  {master ? <p className="sb-muted">Changes here update every copy of this part. <button type="button" className="sb-mini" onClick={() => detach(path, block)}>Detach copy</button></p> : null}
                  {block && !master ? <p><button type="button" className="sb-mini" onClick={() => makePart(path, block)}>Save as linked Part</button></p> : null}
                  {master ? <Fields v={master} set={(p2, k) => setMaster(block.ref, p2, k)} idk={block.ref} />
                    : block ? <Fields v={block} set={(p2, k) => commit((d) => upBlock(d, path, block.id, p2), block.id + k)} idk={block.id} /> : null}
                  {!(block && (block.type === 'banner' || (master && master.type === 'banner'))) ? (
                    <div className="sb-clr">
                      <span>Background colour</span>
                      <input type="color" value={isHex((cfg.bg || {})[sel.key]) ? cfg.bg[sel.key] : '#ffffff'} onChange={(e) => commit((d) => laySub(d, path, 'bg', sel.key, e.target.value), 'bg' + sel.key)} />
                      <button type="button" className="sb-mini" onClick={() => commit((d) => laySub(d, path, 'bg', sel.key, ''))}>Clear</button>
                    </div>
                  ) : null}
                  <div className="sb-h">Hide on</div>
                  {DEVS.map((x) => (
                    <label className="sb-chk" key={x}><input type="checkbox" checked={devOf(sel.key).includes(x)} onChange={() => commit((d) => laySub(d, path, 'dev', sel.key, devOf(sel.key).includes(x) ? devOf(sel.key).filter((y) => y !== x) : [...devOf(sel.key), x]))} />{x}</label>
                  ))}
                  <div className="sb-h">Animation when it scrolls into view</div>
                  <select className="sb-in" value={(cfg.anim || {})[sel.key] || ''} onChange={(e) => commit((d) => laySub(d, path, 'anim', sel.key, e.target.value))}>
                    {ANIMS.map((a) => <option key={a[0]} value={a[0]}>{a[1]}</option>)}
                  </select>
                </div>
              ) : null}
              {tab === 'add' ? (
                <div>
                  <p className="sb-muted">Drag a block onto the page, or click it to add at the bottom. Use Edit view.</p>
                  {MODS.map((g) => (
                    <div key={g[0]}>
                      <div className="sb-h">{g[0]}</div>
                      <div className="sb-tiles">
                        {g[1].map((m) => (
                          <div key={m[0]} className="sb-tile" draggable onClick={() => addBlock(m[0])}
                            onDragStart={(e) => { try { e.dataTransfer.setData('text/plain', 'pf:' + m[0]); e.dataTransfer.effectAllowed = 'copy'; } catch (x) { /* ignore */ } send({ type: 'adddrag', kind: m[0] }); }}
                            onDragEnd={() => send({ type: 'adddrag', kind: null })}><b>{m[2]}</b>{m[1]}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {tab === 'page' ? (
                <div>
                  <div className="sb-h">Sections on {pageName(path)}</div>
                  <p className="sb-muted">Drag to reorder; the page moves with you.</p>
                  {!items.length ? <p className="sb-muted">No sections found yet.</p> : null}
                  <DragList selKey={sel && sel.key} onReorder={(keys) => commit((d) => lay(d, path, { order: keys }), 'order')}
                    rows={items.map((i) => ({ k: i.key, el: (<><span className="sb-lbl" style={{ opacity: i.hidden ? 0.45 : 1 }} onClick={() => send({ type: 'pick', key: i.key })}>{i.label}{i.bid ? ' (block)' : ''}</span><button type="button" className="sb-mini" onClick={() => toggleHide(path, i.key)}>{i.hidden ? 'Show' : 'Hide'}</button></>) }))} />
                  <div className="sb-h">Search results look (SEO)</div>
                  <label>Page title<input className="sb-in" maxLength={120} value={seo.title || ''} onChange={(e) => commit((d) => ({ ...d, pages: { ...d.pages, [path]: { ...(d.pages[path] || {}), title: e.target.value } } }), 'seo' + path)} /></label>
                  <label>Description<textarea rows="3" className="sb-in" maxLength={300} value={seo.description || ''} onChange={(e) => commit((d) => ({ ...d, pages: { ...d.pages, [path]: { ...(d.pages[path] || {}), description: e.target.value } } }), 'seod' + path)} /></label>
                </div>
              ) : null}
              {tab === 'menu' ? (
                <div>
                  <p className="sb-muted">Drag to change the order of the shop menu.</p>
                  <DragList onReorder={(keys) => commit((d) => ({ ...d, navOrder: keys }), 'nav')} rows={menu.map((t) => ({ k: t, el: <span className="sb-lbl">{t}</span> }))} />
                  {doc.navOrder.length ? <button type="button" className="sb-mini" onClick={() => commit((d) => ({ ...d, navOrder: [] }))}>Back to default order</button> : null}
                </div>
              ) : null}
              {tab === 'style' ? (
                <div>
                  <div className="sb-h">Colours</div>
                  {!colours.length ? <p className="sb-muted">No colours found yet.</p> : null}
                  {colours.map((k) => (
                    <div className="sb-clr" key={k}>
                      <span>{pretty(k)}</span>
                      <input type="color" value={doc.theme[k] || vars[k]} onChange={(e) => setTheme(k, e.target.value)} />
                      {doc.theme[k] ? <button type="button" className="sb-mini" onClick={() => clearTheme(k)}>Undo</button> : null}
                    </div>
                  ))}
                  <div className="sb-h">Font</div>
                  <select className="sb-in" value={doc.theme['--pf-font'] || ''} onChange={(e) => (e.target.value ? setTheme('--pf-font', e.target.value) : clearTheme('--pf-font'))}>
                    {FONTS.map((f) => <option key={f[0]} value={f[0]}>{f[1]}</option>)}
                  </select>
                  <div className="sb-h">Corner roundness: {Number.isNaN(radius) ? 'shop default' : radius + 'px'}</div>
                  <input type="range" min="0" max="32" style={{ width: '100%' }} value={Number.isNaN(radius) ? 8 : radius} onChange={(e) => setTheme('--pf-radius', e.target.value + 'px')} />
                  {!Number.isNaN(radius) ? <button type="button" className="sb-mini" onClick={() => clearTheme('--pf-radius')}>Use shop default</button> : null}
                  <div className="sb-h">Custom CSS (advanced)</div>
                  <p className="sb-muted">Checked by the server: no @import, scripts or unsafe links.</p>
                  <textarea rows="6" className="sb-in" maxLength={6000} style={{ fontFamily: 'monospace' }} value={doc.css} onChange={(e) => commit((d) => ({ ...d, css: e.target.value }), 'css')} />
                </div>
              ) : null}
              {tab === 'parts' ? (
                <div>
                  <p className="sb-muted">A Part is a block saved once and used in many places. Edit it here and every copy changes. Select a block, then press "Save as linked Part".</p>
                  {!Object.keys(doc.components).length ? <p className="sb-muted">No parts yet.</p> : null}
                  {Object.keys(doc.components).map((cid) => {
                    const m = doc.components[cid];
                    return (
                      <div className="sb-card cmp" key={cid}>
                        <div className="sb-tile" draggable style={{ marginBottom: 8 }} onClick={() => addBlock('cmp:' + cid)}
                          onDragStart={(e) => { try { e.dataTransfer.setData('text/plain', 'pf:cmp'); e.dataTransfer.effectAllowed = 'copy'; } catch (x) { /* ignore */ } send({ type: 'adddrag', kind: 'cmp:' + cid }); }}
                          onDragEnd={() => send({ type: 'adddrag', kind: null })}>Drag onto the page ({m.type}, used {usage(cid)}x)</div>
                        <input className="sb-in" maxLength={40} value={m.cname || ''} onChange={(e) => setMaster(cid, { cname: e.target.value }, cid + 'n')} />
                        <Fields v={m} set={(p2, k) => setMaster(cid, p2, k)} idk={cid} />
                        <button type="button" className="sb-mini" disabled={usage(cid) > 0} onClick={() => commit((d) => { const c = { ...d.components }; delete c[cid]; return { ...d, components: c }; })}>{usage(cid) > 0 ? 'In use: cannot delete' : 'Delete part'}</button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {tab === 'more' ? (
                <div>
                  <div className="sb-h">Announcement bar</div>
                  <p className="sb-muted">One message per line. Only write what is true.</p>
                  <textarea rows="4" className="sb-in" value={doc.ann} onChange={(e) => commit((d) => ({ ...d, ann: e.target.value }), 'ann')} />
                  <div className="sb-h">Words you changed</div>
                  {!words.length ? <p className="sb-muted">None yet. In Edit view, click any text on the page.</p> : null}
                  {words.map((k) => (
                    <div className="sb-row" style={{ cursor: 'default' }} key={k}>
                      <span className="sb-lbl" style={{ whiteSpace: 'normal' }}><s>{k}</s> &rarr; {doc.words[k]}</span>
                      <button type="button" className="sb-mini" onClick={() => commit((d) => { const w = { ...d.words }; delete w[k]; return { ...d, words: w }; })}>Undo</button>
                    </div>
                  ))}
                  <div className="sb-h">Design file</div>
                  <p className="sb-muted">Export this shop's design, or import one (for example from another shop). Import changes the editor; press Save to publish.</p>
                  <button type="button" className="sb-mini" onClick={download}>Export design</button>{' '}
                  <label className="sb-mini" style={{ cursor: 'pointer' }}>Import design<input type="file" accept="application/json" hidden onChange={importFile} /></label>
                  <div className="sb-h">Saved versions</div>
                  {!hist ? <p className="sb-muted">Loading...</p> : null}
                  {hist && !hist.length ? <p className="sb-muted">No saved versions yet.</p> : null}
                  {hist ? hist.map((h) => (
                    <div className="sb-row" style={{ cursor: 'default' }} key={h.id}>
                      <span className="sb-lbl">{new Date(h.at).toLocaleString('en-KE')}</span>
                      <button type="button" className="sb-mini" onClick={() => restore(h.id)}>Restore</button>
                    </div>
                  )) : null}
                  <p><button type="button" className="sb-mini" onClick={() => { if (window.confirm('Remove ALL saved changes for this shop?')) save(true); }}>Reset whole shop</button></p>
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
        <div className="sb-canvas">
          <div className="sb-frame" style={{ width: WIDTH[dev] }}>
            <iframe ref={fr} title="Shop preview" src={src} />
          </div>
          {!ready ? <div className="sb-ov"><div>{late ? 'This shop is not connected to the builder yet.' : 'Loading the shop...'}</div></div> : null}
        </div>
      </div>
    </div>
  );
}

export default function SiteBuilder() {
  const [shop, setShop] = useState(null);
  if (shop) return <Builder shop={shop} onBack={() => setShop(null)} />;
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 className="center">Site builder</h1>
      <p className="center muted">Choose the frontend you want to change.</p>
      {SHOPS.map((s) => (
        <section className="card" key={s.code}>
          <div className="mrow">
            <span className="grow"><b>{s.name}</b><br /><span className="muted">{s.note}</span></span>
            <button type="button" onClick={() => setShop(s)}>Open</button>
          </div>
        </section>
      ))}
    </div>
  );
}
