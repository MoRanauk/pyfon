import { useEffect } from 'react';

// Live editing engine. Everyone gets saved words, layout, blocks, parts and SEO. Only the dev Site builder can edit.
export const EDIT = (() => { try { return window.parent !== window && new URLSearchParams(location.search).get('edit') === '1'; } catch (e) { return false; } })();
const PO = (() => { try { return new URL(document.referrer).origin; } catch (e) { return '*'; } })();
const HEX = /^#[0-9a-f]{6}$/i;
const SAFE = (u) => (/^(https?:\/\/|\/|#)/i.test(u || '') ? u : '#');
const NS = 'script,style,.pf-ph,.pf-bar';
let WORDS = {}; let LAYOUT = {}; let BLOCKS = {}; let COMP = {}; let PAGES = {};
let MODE = 'browse'; let SET = null; let EDITING = null; let SEL = null; let HOVER = null; let ADD = null; let DRAG = null; let BAR = null; let IO = null;
let LASTL = ''; let timer = 0; let installed = false;
const rec = new WeakMap();
const seen = new WeakSet();
const post = (m) => { try { window.parent.postMessage({ pf: 1, ...m }, PO); } catch (e) { /* ignore */ } };
const here = () => window.location.pathname;
const ws = (s, re) => (s.match(re) || [''])[0];
const editing = () => EDIT && MODE === 'edit';
const secs = (r) => [...r.children].filter((x) => !x.matches(NS));
const sigOf = (b) => JSON.stringify(b.type === 'component' ? [b, COMP[b.ref] || 0] : b);
const resolve = (b) => {
  if (b.type !== 'component') return b;
  const m = COMP[b.ref];
  return m ? { ...m, id: b.id, ref: b.ref, type: m.type } : { id: b.id, type: 'spacer', height: 10, ref: b.ref };
};

function root() {
  let c = document.querySelector('main');
  while (c) {
    const k = secs(c);
    if (k.length === 1 && k[0].children.length > 1) c = k[0]; else break;
  }
  return c;
}
function keyOf(list) {
  const seenK = {};
  return list.map((el) => {
    if (el.dataset.bid) return ['blk:' + el.dataset.bid, el];
    const b = ((el.className && el.className.toString().split(' ')[0]) || el.tagName.toLowerCase()).replace(/[^a-z0-9_-]/gi, '');
    seenK[b] = seenK[b] || 0;
    const k = b + ':' + seenK[b];
    seenK[b] += 1;
    return [k, el];
  });
}
const lab = (e, k) => ((e.querySelector('h1,h2,h3,h4') || e).textContent.replace(/\s+/g, ' ').trim().slice(0, 32) || k);
function flip(els, fn) {
  const a = els.map((e) => e.getBoundingClientRect().top);
  fn();
  els.forEach((e, i) => {
    const d = a[i] - e.getBoundingClientRect().top;
    if (!d) return;
    e.style.transition = 'none';
    e.style.transform = 'translateY(' + d + 'px)';
    e.getBoundingClientRect();
    e.style.transition = 'transform .22s ease';
    e.style.transform = '';
    setTimeout(() => { e.style.transition = ''; }, 260);
  });
}

function build(raw) {
  const b = resolve(raw);
  const s = document.createElement('section');
  s.dataset.bid = raw.id;
  if (raw.type === 'component') s.dataset.cref = raw.ref;
  s.dataset.sig = sigOf(raw);
  const w = document.createElement('div');
  w.style.cssText = 'max-width:900px;margin:0 auto;padding:28px 16px;text-align:center';
  const mk = (tag, f, def, css) => { const e = document.createElement(tag); e.dataset.bf = f; e.textContent = b[f] || def; e.style.cssText = css || ''; return e; };
  const btn = (f, def) => { const a = document.createElement('a'); a.dataset.bf = f; a.href = SAFE(b.link); a.textContent = b[f] || def; a.style.cssText = 'display:inline-block;margin-top:14px;padding:12px 26px;border-radius:999px;background:var(--pf-text,#222);color:#fff;text-decoration:none'; return a; };
  const note = (t) => { const d = document.createElement('div'); d.dataset.pfskip = '1'; d.textContent = t; d.style.cssText = 'padding:40px;border:2px dashed #bbb;border-radius:12px;color:#777'; return d; };
  const t = b.type;
  if (t === 'heading') w.appendChild(mk('h2', 'text', 'A new heading', 'margin:0;font-size:32px'));
  else if (t === 'text') w.appendChild(mk('p', 'text', 'Write your text here. Click it to change the words.', 'margin:0;line-height:1.6;font-size:17px'));
  else if (t === 'button') w.appendChild(btn('label', 'Click me'));
  else if (t === 'quote') { w.appendChild(mk('p', 'text', 'A short customer quote.', 'font-size:22px;font-style:italic;margin:0 0 10px')); w.appendChild(mk('p', 'by', 'Customer name', 'margin:0;opacity:.7')); }
  else if (t === 'columns') {
    const g = document.createElement('div');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;text-align:left';
    ['c1', 'c2', 'c3'].forEach((f, i) => g.appendChild(mk('p', f, 'Column ' + (i + 1) + ' text', 'margin:0;line-height:1.6')));
    w.appendChild(g);
  } else if (t === 'gallery') {
    const u = (b.urls || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
    if (!u.length) w.appendChild(note('Add image links in the panel (one per line)'));
    else {
      const g = document.createElement('div');
      g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px';
      u.forEach((x) => { const i = document.createElement('img'); i.src = SAFE(x); i.alt = ''; i.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px'; g.appendChild(i); });
      w.appendChild(g);
    }
  } else if (t === 'image') {
    if (b.url) { const i = document.createElement('img'); i.src = SAFE(b.url); i.alt = ''; i.style.cssText = 'max-width:100%;border-radius:12px'; w.appendChild(i); } else w.appendChild(note('Add an image link in the panel'));
  } else if (t === 'banner') {
    s.style.background = HEX.test(b.bg || '') ? b.bg : 'var(--pf-hero,#3a2630)';
    s.style.color = '#fff';
    w.style.padding = '64px 16px';
    w.appendChild(mk('h2', 'title', 'Your headline', 'margin:0 0 10px;font-size:34px'));
    w.appendChild(mk('p', 'text', 'Add a short line of text here.', 'margin:0;font-size:17px'));
    w.appendChild(btn('label', 'Learn more'));
  } else if (t === 'spacer') { w.style.padding = '0'; w.style.height = Math.min(300, Math.max(10, +b.height || 60)) + 'px'; }
  else if (t === 'divider') { const h = document.createElement('hr'); h.style.cssText = 'border:0;border-top:1px solid rgba(0,0,0,.2)'; w.appendChild(h); }
  else if (t === 'video') {
    const u = b.url || '';
    const y = u.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
    if (y) { const f = document.createElement('iframe'); f.src = 'https://www.youtube.com/embed/' + y[1]; f.allowFullscreen = true; f.style.cssText = 'width:100%;aspect-ratio:16/9;border:0;border-radius:12px'; w.appendChild(f); }
    else if (/^https:\/\/.+\.mp4/i.test(u)) { const v = document.createElement('video'); v.src = u; v.controls = true; v.style.cssText = 'width:100%;border-radius:12px'; w.appendChild(v); }
    else w.appendChild(note('Add a YouTube or .mp4 link in the panel'));
  }
  s.appendChild(w);
  return s;
}

function textPass() {
  if (!document.body) return;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n = w.nextNode();
  while (n) {
    const p = n.parentElement;
    const cur = n.nodeValue;
    if (p && cur.trim() && !p.closest('script,style,textarea,noscript,.pf-bar,.pf-ph,[data-bid]') && !(EDITING && EDITING.contains(n))) {
      let r = rec.get(n);
      if (r && cur !== r.r) r = null;
      const key = r ? r.o : cur.trim();
      if (Object.prototype.hasOwnProperty.call(WORDS, key)) {
        const v = ws(cur, /^\s*/) + WORDS[key] + ws(cur, /\s*$/);
        if (v !== cur) n.nodeValue = v;
        rec.set(n, { o: key, r: v });
      } else if (r) {
        n.nodeValue = ws(cur, /^\s*/) + key + ws(cur, /\s*$/);
        rec.delete(n);
      }
    }
    n = w.nextNode();
  }
}

function order(r, L) {
  if (!L.length) return;
  const list = keyOf(secs(r));
  const keys = list.map((x) => x[0]);
  const inL = L.filter((k) => keys.includes(k));
  const target = keys.slice();
  let n = 0;
  keys.forEach((k, i) => { if (L.includes(k)) { target[i] = inL[n]; n += 1; } });
  if (target.join('|') === keys.join('|')) return;
  const by = Object.fromEntries(list);
  const go = () => target.forEach((k) => r.appendChild(by[k]));
  if (EDIT) flip(list.map((x) => x[1]), go); else go();
}

function place() {
  if (!BAR) return;
  const t = SEL && SEL.isConnected ? SEL : HOVER;
  if (!editing() || !t || !t.isConnected) { BAR.style.display = 'none'; return; }
  const r = t.getBoundingClientRect();
  BAR.style.display = 'flex';
  BAR.style.top = (r.top + window.scrollY + 4) + 'px';
  BAR.style.left = (r.left + window.scrollX + 4) + 'px';
  BAR.querySelector('[data-act=del]').style.display = t.dataset.bid ? '' : 'none';
  BAR.querySelector('[data-act=hide]').textContent = t.dataset.pfh ? 'Show' : 'Hide';
}

function seo() {
  const pg = PAGES[here()] || {};
  if (pg.title) document.title = pg.title;
  if (pg.description) {
    let m = document.querySelector('meta[name=description]');
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
    m.content = pg.description;
  }
}

function apply() {
  textPass();
  seo();
  const ed = editing();
  document.documentElement.classList.toggle('pf-editing', ed);
  document.querySelectorAll('nav.cats > .dd').forEach((d) => d.setAttribute('draggable', ed ? 'true' : 'false'));
  const r = root();
  if (!r) return;
  const p = here();
  const want = BLOCKS[p] || [];
  secs(r).filter((x) => x.dataset.bid).forEach((h) => { const b = want.find((q) => q.id === h.dataset.bid); if (!b || h.dataset.sig !== sigOf(b)) h.remove(); });
  want.forEach((b) => { if (!secs(r).some((x) => x.dataset.bid === b.id)) r.appendChild(build(b)); });
  const cfg = LAYOUT[p] || {};
  if (!DRAG) order(r, cfg.order || []);
  const hid = cfg.hidden || [];
  const bg = cfg.bg || {};
  const list = keyOf(secs(r));
  list.forEach(([k, e]) => {
    if (EDIT) e.dataset.pfs = k;
    if (hid.includes(k)) e.dataset.pfh = '1'; else delete e.dataset.pfh;
    if (HEX.test(bg[k] || '')) { e.style.background = bg[k]; e.dataset.pfb = '1'; } else if (e.dataset.pfb) { e.style.background = ''; delete e.dataset.pfb; }
    const dv = (cfg.dev || {})[k] || [];
    [['phone', 'pfhp'], ['tablet', 'pfht'], ['desktop', 'pfhd']].forEach((x) => { if (dv.includes(x[0])) e.dataset[x[1]] = '1'; else delete e.dataset[x[1]]; });
    const an = (cfg.anim || {})[k];
    if (an && ['fade', 'up', 'zoom'].includes(an)) {
      e.dataset.pfa = an;
      if (IO && !seen.has(e)) { seen.add(e); IO.observe(e); }
    } else { delete e.dataset.pfa; e.classList.remove('pf-in'); }
  });
  if (EDIT) {
    const items = list.map(([k, e]) => ({ key: k, label: lab(e, k), hidden: !!e.dataset.pfh, bid: e.dataset.bid || '' }));
    const sig = p + JSON.stringify(items);
    if (sig !== LASTL) { LASTL = sig; post({ type: 'layout', path: p, items }); }
  }
  place();
}
const schedule = () => { clearTimeout(timer); timer = setTimeout(apply, 30); };

function report() {
  if (!EDIT) return;
  const el = document.querySelector('.mood-root');
  const vars = {};
  if (el) for (let i = 0; i < el.style.length; i += 1) { const k = el.style[i]; if (k.startsWith('--')) vars[k] = el.style.getPropertyValue(k).trim(); }
  post({ type: 'ready', vars, titles: [...document.querySelectorAll('nav.cats > .dd')].map((d) => d.dataset.nt).filter(Boolean), path: here() });
}

function leafOf(t) {
  let e = t;
  for (let i = 0; e && i < 4; i += 1, e = e.parentElement) {
    if (e === document.body || e.closest('.pf-bar') || e.hasAttribute('data-pfskip')) return null;
    const txt = e.textContent.trim();
    if (!e.children.length && e.childNodes.length === 1 && e.firstChild.nodeType === 3 && txt && !/^(INPUT|TEXTAREA|SELECT|IMG)$/i.test(e.tagName)) return /KES\s*[\d,]/.test(txt) ? null : e;
  }
  return null;
}
function sectionOf(n) {
  const r = root();
  let e = n;
  while (e && e.parentElement !== r) e = e.parentElement;
  return e && e.nodeType === 1 && !e.matches(NS) ? e : null;
}
function select(s) {
  if (SEL) delete SEL.dataset.pfsel;
  SEL = s;
  if (s) s.dataset.pfsel = '1';
  place();
  post({ type: 'select', path: here(), key: s ? s.dataset.pfs || '' : '', bid: s ? s.dataset.bid || '' : '', ref: s ? s.dataset.cref || '' : '' });
}
function saveOrder(r) { post({ type: 'order', path: here(), order: keyOf(secs(r)).map((x) => x[0]) }); }

function startEdit(el) {
  const tn = el.firstChild;
  const blk = el.closest('[data-bid]');
  const r = rec.get(tn);
  const orig = r ? r.o : tn.nodeValue.trim();
  EDITING = el;
  el.contentEditable = 'true';
  el.focus();
  let cancel = false;
  const key = (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } if (e.key === 'Escape') { cancel = true; el.blur(); } };
  const done = () => {
    el.removeEventListener('keydown', key);
    el.removeEventListener('blur', done);
    const val = el.textContent.replace(/\s+/g, ' ').trim();
    el.contentEditable = 'false';
    if (tn.parentNode !== el) { while (el.firstChild) el.removeChild(el.firstChild); el.appendChild(tn); }
    tn.nodeValue = orig;
    EDITING = null;
    if (blk && el.dataset.bf) {
      if (!cancel && val) post({ type: 'blockText', path: here(), id: blk.dataset.bid, ref: blk.dataset.cref || '', field: el.dataset.bf, value: val });
      return;
    }
    rec.delete(tn);
    if (!cancel && val) {
      WORDS = { ...WORDS };
      if (val === orig) delete WORDS[orig]; else WORDS[orig] = val;
    }
    apply();
    post({ type: 'words', words: { ...WORDS } });
  };
  el.addEventListener('keydown', key);
  el.addEventListener('blur', done);
}

function startDrag(t, ev) {
  const r = t.parentElement;
  ev.preventDefault();
  DRAG = t;
  select(t);
  t.dataset.pfdrag = '1';
  document.body.classList.add('pf-dragging');
  const move = (e) => {
    const others = secs(r).filter((x) => x !== t);
    let before = null;
    for (const s of others) { const b = s.getBoundingClientRect(); if (e.clientY < b.top + b.height / 2) { before = s; break; } }
    const all = secs(r);
    const nxt = all[all.indexOf(t) + 1] || null;
    if (before !== nxt) flip(all, () => r.insertBefore(t, before));
    if (e.clientY < 70) window.scrollBy(0, -16);
    if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 16);
    place();
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    delete t.dataset.pfdrag;
    document.body.classList.remove('pf-dragging');
    DRAG = null;
    saveOrder(r);
    setTimeout(place, 260);
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up, { once: true });
}

function act(a) {
  const t = SEL && SEL.isConnected ? SEL : HOVER;
  if (!t) return;
  const r = t.parentElement;
  if (a === 'up' || a === 'down') {
    const ss = secs(r);
    const i = ss.indexOf(t);
    const j = a === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= ss.length) return;
    flip(ss, () => (a === 'up' ? r.insertBefore(t, ss[j]) : r.insertBefore(ss[j], t)));
    saveOrder(r);
    setTimeout(place, 260);
  }
  if (a === 'hide') post({ type: 'toggle', path: here(), key: t.dataset.pfs });
  if (a === 'del') post({ type: 'remove', path: here(), id: t.dataset.bid });
}

function clearPh() { const p = document.querySelector('.pf-ph'); if (p) p.remove(); }

const BASE = 'html:not(.pf-editing) [data-pfh]{display:none !important}.pf-editing [data-pfh]{opacity:.35}'
  + '@media (max-width:640px){html:not(.pf-editing) [data-pfhp]{display:none !important}}'
  + '@media (min-width:641px) and (max-width:1024px){html:not(.pf-editing) [data-pfht]{display:none !important}}'
  + '@media (min-width:1025px){html:not(.pf-editing) [data-pfhd]{display:none !important}}'
  + 'html:not(.pf-editing) [data-pfa]{opacity:0;transition:opacity .7s ease,transform .7s ease}'
  + 'html:not(.pf-editing) [data-pfa=up]{transform:translateY(30px)}html:not(.pf-editing) [data-pfa=zoom]{transform:scale(.94)}'
  + 'html:not(.pf-editing) [data-pfa].pf-in{opacity:1;transform:none}';

function install() {
  if (installed) return;
  installed = true;
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  if ('IntersectionObserver' in window) IO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('pf-in'); IO.unobserve(e.target); seen.delete(e.target); } }), { threshold: 0.12 });
  const st = document.createElement('style');
  st.textContent = BASE;
  document.head.appendChild(st);
  if (!EDIT) return;
  st.textContent += '.pf-editing [data-pfs]{outline:1px dashed rgba(45,127,249,.45);outline-offset:-1px}.pf-editing [data-pfs][data-pfsel]{outline:2px solid #2d7ff9}.pf-editing [data-pfs][data-pfdrag]{opacity:.65;box-shadow:0 14px 44px rgba(0,0,0,.28);position:relative;z-index:5}'
    + '.pf-editing [data-cref]{outline:2px dashed #8a5bb5 !important}'
    + '.pf-editing h1:hover,.pf-editing h2:hover,.pf-editing h3:hover,.pf-editing h4:hover,.pf-editing p:hover,.pf-editing a:hover,.pf-editing button:hover,.pf-editing span:hover,.pf-editing li:hover,.pf-editing em:hover,.pf-editing b:hover{outline:1px dashed #c9a14a;cursor:text}'
    + '.pf-bar{position:absolute;z-index:99999;display:none;gap:2px;background:#2d7ff9;border-radius:6px;padding:3px;font:600 12px/1 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3)}.pf-bar button{all:unset;color:#fff;padding:6px 8px;border-radius:4px;cursor:pointer}.pf-bar button:hover{background:rgba(255,255,255,.24)}.pf-bar button[data-act=drag]{cursor:grab}'
    + '.pf-ph{height:72px;margin:8px 16px;border:2px dashed #2d7ff9;border-radius:10px;background:rgba(45,127,249,.08);color:#2d7ff9;display:flex;align-items:center;justify-content:center;font:600 13px system-ui,sans-serif}body.pf-dragging{user-select:none;cursor:grabbing}';
  BAR = document.createElement('div');
  BAR.className = 'pf-bar';
  [['drag', '\u283f Drag'], ['up', 'Up'], ['down', 'Down'], ['hide', 'Hide'], ['del', 'Delete']].forEach((x) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.act = x[0]; b.textContent = x[1];
    BAR.appendChild(b);
  });
  BAR.addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); const t = SEL && SEL.isConnected ? SEL : HOVER; if (b && b.dataset.act === 'drag' && t) startDrag(t, e); });
  BAR.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && b.dataset.act !== 'drag') act(b.dataset.act); });
  document.body.appendChild(BAR);
  window.addEventListener('message', (e) => {
    const m = e.data;
    if (e.source !== window.parent || !m || m.pf !== 1) return;
    if (m.type === 'set' && SET) SET(m);
    if (m.type === 'mode') { MODE = m.mode === 'edit' ? 'edit' : 'browse'; if (EDITING) EDITING.blur(); if (MODE !== 'edit') select(null); schedule(); }
    if (m.type === 'adddrag') { ADD = m.kind || null; if (!ADD) clearPh(); }
    if (m.type === 'pick') {
      const t = document.querySelector('[data-pfs="' + CSS.escape(m.key) + '"]');
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); select(t); }
    }
  });
  document.addEventListener('mouseover', (e) => {
    if (MODE !== 'edit' || DRAG || e.target.closest('.pf-bar')) return;
    const s = sectionOf(e.target);
    if (s) { HOVER = s; place(); }
  });
  window.addEventListener('resize', schedule);
  document.addEventListener('click', (e) => {
    if (MODE !== 'edit' || e.target.closest('.pf-bar')) return;
    if (EDITING && EDITING.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const s = sectionOf(e.target);
    if (s) select(s);
    const el = leafOf(e.target);
    if (el) startEdit(el);
  }, true);
  let nav = null;
  document.addEventListener('dragstart', (e) => {
    const d = MODE === 'edit' && e.target.closest && e.target.closest('nav.cats > .dd');
    if (d) { nav = d; try { e.dataTransfer.setData('text/plain', 'nav'); } catch (x) { /* ignore */ } }
  }, true);
  document.addEventListener('dragover', (e) => {
    if (nav) { e.preventDefault(); return; }
    if (!ADD) return;
    e.preventDefault();
    const r = root();
    if (!r) return;
    let ph = document.querySelector('.pf-ph');
    if (!ph) { ph = document.createElement('div'); ph.className = 'pf-ph'; ph.textContent = 'Drop here'; }
    const all = secs(r);
    let before = null;
    for (const s of all) { const b = s.getBoundingClientRect(); if (e.clientY < b.top + b.height / 2) { before = s; break; } }
    if (ph.parentElement !== r || ph.nextElementSibling !== before) flip(all, () => r.insertBefore(ph, before));
  }, true);
  document.addEventListener('dragleave', (e) => { if (ADD && !e.relatedTarget) clearPh(); }, true);
  document.addEventListener('drop', (e) => {
    if (nav) {
      const t = e.target.closest && e.target.closest('nav.cats > .dd');
      if (t && t !== nav) {
        const list = [...document.querySelectorAll('nav.cats > .dd')].map((d) => d.dataset.nt);
        list.splice(list.indexOf(nav.dataset.nt), 1);
        list.splice(list.indexOf(t.dataset.nt), 0, nav.dataset.nt);
        post({ type: 'nav', order: list });
      }
      nav = null; e.preventDefault(); return;
    }
    if (!ADD) return;
    e.preventDefault();
    const r = root();
    const ph = document.querySelector('.pf-ph');
    let idx = r ? secs(r).length : 0;
    if (ph && r) { idx = secs(r).filter((s) => ph.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING).length; ph.remove(); }
    post({ type: 'drop', kind: ADD, index: idx, path: here() });
    ADD = null;
  }, true);
}

function globalCss(theme, css) {
  let c = '';
  const f = theme['--pf-font'];
  const rd = theme['--pf-radius'];
  if (f && /^[A-Za-z0-9 ,'"-]{1,100}$/.test(f)) c += '.mood-root,.mood-root button,.mood-root input,.mood-root textarea{font-family:' + f + '}';
  if (rd && /^\d{1,2}px$/.test(rd)) c += '.mood-root img,.mood-root button,.mood-root [class*=card],.mood-root [class*=btn]{border-radius:' + rd + '}';
  return c + (css || '');
}

export function useSiteEdit(content, setContent, defaults) {
  SET = (m) => setContent((c) => ({
    ...c, theme: m.theme || {}, words: m.words || {}, navOrder: m.navOrder || [], layout: m.layout || {}, blocks: m.blocks || {},
    components: m.components || {}, pages: m.pages || {}, customCss: m.customCss || '',
    announce: m.announce && m.announce.length ? m.announce : defaults.announce,
  }));
  useEffect(() => { install(); }, []);
  useEffect(() => {
    WORDS = content.words || {}; LAYOUT = content.layout || {}; BLOCKS = content.blocks || {}; COMP = content.components || {}; PAGES = content.pages || {};
    schedule();
  }, [content.words, content.layout, content.blocks, content.components, content.pages]);
  useEffect(() => {
    let el = document.getElementById('pf-global');
    if (!el) { el = document.createElement('style'); el.id = 'pf-global'; document.head.appendChild(el); }
    el.textContent = globalCss(content.theme || {}, content.customCss || '');
  }, [content.theme, content.customCss]);
  useEffect(() => { const t = setTimeout(report, 150); return () => clearTimeout(t); }, [content.theme, content.navOrder]);
}
