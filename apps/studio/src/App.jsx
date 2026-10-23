import { useEffect, useState } from 'react';
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
