import { askAi } from './askAi.js';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Footer, HelpButton } from '@pyfon/ui';
import { HELP_TOPICS, HELP_FAQ } from './helpTopics.js';
import { HELP_TOURS } from './helpTours.js';
import { useAuth, nameOf } from './Auth.jsx';
import { STAGE, STAGE_LABEL, FIXED, switchPortal } from './api.js';
import { ls, photoKey } from './store.js';
import { DEV_NAV as DEV_MENU } from './devNav.js';
import { PARTNER_MENU } from './partnerNav.js';

const I = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><path d="M12 22.08V12"/>',
  video: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  tools: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  gear: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  pulse: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
};
function Icon({ n }) { return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: I[n] }} />; }

const PARTNER_NAV = [
  ['/', 'home', 'Dashboard', true], ['/orders', 'grid', 'Orders flow'], ['/queue', 'list', 'My queue'],
  ['/products', 'box', 'Products'], ['/csv', 'box', 'Product file'], ['/approvals', 'list', 'Approvals'], ['/activity', 'list', 'Activity log'], ['/videos', 'video', 'Videos'], ['/connect', 'chat', 'Connect'], ['/tickets', 'help', 'Tickets'],
  ['/tools', 'tools', 'Workspace tools'], ['/settings', 'gear', 'Settings'], ['/help', 'help', 'Help'],
];
const DEV_NAV = [
  ['/', 'home', 'Dashboard', true], ['/health', 'gear', 'System health'], ['/logs', 'list', 'Logs and traces'], ['/users', 'users', 'Users'], ['/tickets', 'help', 'Tickets'], ['/activity', 'list', 'Activity log'], ['/videos', 'video', 'Videos'], ['/tools', 'tools', 'Workspace tools'],
  ['/settings', 'gear', 'Settings'], ['/help', 'help', 'Help'],
];

const MENU = STAGE === 'dev' ? DEV_MENU : PARTNER_MENU;
const liveGroups = () => MENU.map((g) => ({ ...g, items: g.items.filter((i) => i[2]) })).filter((g) => g.items.length);
const inGroup = (g, p) => g.items.some(([to]) => (to === '/' ? p === '/' : p === to || p.startsWith(to + '/'))) || (g.name === 'Work' && (p.startsWith('/jobs/') || p.startsWith('/invoice/')));
function DevSide({ path }) {
  return liveGroups().map((g) => (
    <NavLink key={g.name} to={g.items[0][0]} end className={inGroup(g, path) ? 'active' : ''}><Icon n={g.icon} />{g.name}</NavLink>
  ));
}
function TopTabs({ path }) {
  const g = liveGroups().find((x) => inGroup(x, path));
  if (!g || g.items.length < 2) return null;
  return (
    <nav className="toptabs">
      <div className="tt-links">
        {g.items.map(([to, label]) => <NavLink key={to} to={to} end>{label}</NavLink>)}
      </div>
    </nav>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const go = useNavigate();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  const covering = user && user.stage && user.stage !== STAGE;
  const nav = STAGE === 'dev' ? DEV_NAV : PARTNER_NAV;
  const photo = ls.get(photoKey(user), null);
  return (
    <div className="app">
      {open ? <div className="scrim" onClick={() => setOpen(false)} /> : null}
      <aside className={'side' + (open ? ' open' : '')}>
        <div style={{ padding: '4px 8px 10px' }}>
          <div className="wordmark" style={{ color: '#fff', fontSize: '24px' }}>M3 <b>Labs</b></div>
          <span className="badge">{STAGE_LABEL[STAGE]}</span>
        </div>
        {MENU ? <DevSide path={loc.pathname} /> : nav.map(([to, icon, label, end]) => (
          <NavLink key={to} to={to} end={Boolean(end)}><Icon n={icon} />{label}</NavLink>
        ))}
        <div className="me" role="link" tabIndex={0} title="Your settings" style={{ cursor: 'pointer' }} onClick={() => go('/settings')} onKeyDown={(e) => { if (e.key === 'Enter') go('/settings'); }}>
          <span className="avatar">{photo ? <img src={photo} alt="" /> : <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>}</span>
          <span style={{ fontSize: '13px', lineHeight: 1.3 }}>{nameOf(user)}</span>
        </div>
        {!FIXED ? <button type="button" className="sidebtn" onClick={() => switchPortal(null)}><Icon n="swap" />Switch desk</button> : null}
        <button type="button" className="sidebtn" onClick={logout}><Icon n="out" />Sign out</button>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button type="button" className="burger linkbtn" aria-label="Open menu" onClick={() => setOpen(true)} style={{ width: '28px', height: '28px', padding: 0, background: 'none', color: '#0b2a4a' }}><Icon n="menu" /></button>
          <b style={{ color: '#0b2a4a' }}>M3 Labs</b>
          <span className="badge">{STAGE_LABEL[STAGE]}</span>
        </header>
        <TopTabs path={loc.pathname} />
        {covering ? <div className="cover">You are covering for the {STAGE_LABEL[STAGE]} partner. Every action is logged as acting for them.</div> : null}
        <main className="page wide">{children}</main>
        <Footer /><HelpButton ai={askAi} path={loc.pathname} topics={HELP_TOPICS} faq={HELP_FAQ} tours={HELP_TOURS} />
      </div>
    </div>
  );
}
