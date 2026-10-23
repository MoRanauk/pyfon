import fs from 'node:fs';
import path from 'node:path';
const A = path.resolve('..', 'apps');
const src = path.join(A, 'prestige-m');
const dst = path.join(A, 'studio');
fs.mkdirSync(path.join(dst, 'src'), { recursive: true });
const swap = (s) => s.replace(/5175/g, '5177').replace(/prestige-m/g, 'studio');
const put = (f, text, force) => { const t = path.join(dst, f); if (fs.existsSync(t) && !force) { console.log('Kept: ' + f); return; } fs.writeFileSync(t, text); console.log('Wrote: ' + f); };
put('package.json', swap(fs.readFileSync(path.join(src, 'package.json'), 'utf8')));
const vc = fs.readdirSync(src).find((x) => /^vite\.config\./.test(x));
if (vc) put(vc, swap(fs.readFileSync(path.join(src, vc), 'utf8')));
else console.log('NOT FOUND: vite config in prestige-m');
put('index.html', fs.readFileSync(path.join(src, 'index.html'), 'utf8').replace(/<title>[^<]*<\/title>/, '<title>Studio</title>'));
fs.copyFileSync(path.join(src, 'src', 'siteEdit.js'), path.join(dst, 'src', 'siteEdit.js'));
console.log('Copied: siteEdit.js');
put('src/studio.css', `body{margin:0;font-family:system-ui,sans-serif}
.st-head{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;border-bottom:1px solid rgba(0,0,0,.1)}
.st-head b{font-size:20px}
nav.cats{display:flex;gap:18px}
nav.cats a{color:inherit;text-decoration:none}
nav.cats a.active{font-weight:700}
.st-start{padding:60px 16px;text-align:center}
.st-start div{max-width:560px;margin:0 auto;opacity:.75}
`);
put('src/main.jsx', `import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './studio.css';

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);
`);
put('src/App.jsx', `import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Footer } from '@pyfon/ui';
import { themeVars } from '@pyfon/theme';
import { useSiteEdit } from './siteEdit.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const NAME = 'Studio';
const PAGES = [['Home', '/'], ['About', '/about'], ['Contact', '/contact']];

export default function App() {
  const [content, setContent] = useState({});
  const loc = useLocation();
  useSiteEdit(content, setContent, { announce: [] });
  useEffect(() => {
    fetch(API + '/v1/content/studio').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.data) setContent(j.data); }).catch(() => {});
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const ord = content.navOrder || [];
  const nav = [...PAGES].sort((a, b) => { const x = ord.indexOf(a[0]); const y = ord.indexOf(b[0]); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
  const vars = { ...themeVars('m3'), ...(content.theme || {}), background: 'var(--pf-bg, #fff)', color: 'var(--pf-text, #222)' };
  return (
    <div className="mood-root" style={vars}>
      <header className="st-head">
        <b>{NAME}</b>
        <nav className="cats">{nav.map((p) => <div className="dd" key={p[0]} data-nt={p[0]}><NavLink to={p[1]}>{p[0]}</NavLink></div>)}</nav>
      </header>
      <main style={{ minHeight: '60vh' }}>
        <section className="st-start"><div><h2>This page is blank</h2><p>Open Site builder in the developer console, choose Studio, and drag blocks here.</p></div></section>
      </main>
      <Footer />
    </div>
  );
}
`);
