const KEY = 'pf_mode';
const ORDER = ['light', 'dark', 'system'];
const ICON = { light: '\u2600', dark: '\u263E', system: '\u25D0' };
const NAME = { light: 'Light', dark: 'Dark', system: 'System' };
let started = false;
let btn = null;

const CSS = `
html[data-mode="dark"]{background:#f0f0f0;filter:invert(1) hue-rotate(180deg)}
html[data-mode="dark"] img,html[data-mode="dark"] video,html[data-mode="dark"] iframe,html[data-mode="dark"] canvas,html[data-mode="dark"] picture,html[data-mode="dark"] [style*="url("],html[data-mode="dark"] .pf-keep{filter:invert(1) hue-rotate(180deg)}
html[data-mode="dark"] [style*="url("] img,html[data-mode="dark"] [style*="url("] video{filter:none}
@media print{html[data-mode="dark"],html[data-mode="dark"] img,html[data-mode="dark"] video,html[data-mode="dark"] [style*="url("]{filter:none}}
.pf-mode{position:fixed;left:14px;bottom:14px;z-index:2147483000;width:38px;height:38px;border-radius:50%;border:1px solid rgba(127,127,127,.55);background:#ffffff;color:#111111;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);padding:0}
.pf-mode:focus-visible{outline:2px solid #c9a14a;outline-offset:2px}
`;

export function getMode() {
  try { const v = localStorage.getItem(KEY); if (ORDER.includes(v)) return v; } catch (e) { /* ignore */ }
  return 'system';
}

function effective(m) {
  if (m === 'dark') return 'dark';
  if (m === 'light') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(m) {
  const root = document.documentElement;
  root.setAttribute('data-mode', effective(m));
  root.setAttribute('data-mode-pref', m);
  if (btn) {
    btn.textContent = ICON[m];
    btn.setAttribute('aria-label', 'Colour mode: ' + NAME[m] + '. Press to change.');
    btn.title = 'Colour mode: ' + NAME[m];
  }
}

export function setMode(m) {
  if (!ORDER.includes(m)) return;
  try { localStorage.setItem(KEY, m); } catch (e) { /* ignore */ }
  apply(m);
}

export function startThemeMode() {
  if (started || typeof document === 'undefined') return;
  started = true;
  const st = document.createElement('style');
  st.setAttribute('data-pf-mode', '1');
  st.textContent = CSS;
  document.head.appendChild(st);
  apply(getMode());
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => { if (getMode() === 'system') apply('system'); };
    if (mq.addEventListener) mq.addEventListener('change', on);
    else if (mq.addListener) mq.addListener(on);
  }
  const make = () => {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pf-mode';
    btn.addEventListener('click', () => {
      const next = ORDER[(ORDER.indexOf(getMode()) + 1) % ORDER.length];
      setMode(next);
    });
    document.body.appendChild(btn);
    apply(getMode());
  };
  if (document.body) make();
  else document.addEventListener('DOMContentLoaded', make);
}
