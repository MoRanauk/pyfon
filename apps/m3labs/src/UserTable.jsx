import { useEffect, useMemo, useState } from 'react';

const COLS = [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['createdAt', 'Registered'], ['lastLogin', 'Last sign-in'], ['orders', 'Orders'], ['active', 'Status']];
const day = (d) => (d ? new Date(d).toLocaleDateString('en-KE') : '-');
const th = { textAlign: 'left', padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: '2px solid #ccc', background: '#f6f6f6' };
const td = { padding: '6px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' };

export default function UserTable({ rows, onAct }) {
  const [sort, setSort] = useState({ k: 'name', d: 1 });
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); };
  }, []);

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const x = a[sort.k]; const y = b[sort.k];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    const c = typeof x === 'string' ? x.localeCompare(y) : (x > y ? 1 : x < y ? -1 : 0);
    return c * sort.d;
  }), [rows, sort]);

  function open(e, u) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ u, x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 200) });
  }
  function openFromButton(e, u) {
    const r = e.currentTarget.getBoundingClientRect();
    open({ preventDefault() {}, stopPropagation: e.stopPropagation.bind(e), clientX: r.left - 150, clientY: r.bottom }, u);
  }
  function items(u) {
    const list = [];
    if (u.role !== 'developer') {
      list.push(['Send temporary password', () => onAct(u, 'temp')]);
      list.push(['Sign out', () => onAct(u, 'out')]);
      if (['customer', 'vendor'].includes(u.role)) list.push([u.active ? 'Switch off' : 'Switch on', () => onAct(u, 'active')]);
    }
    list.push(['Copy email', () => { if (navigator.clipboard) navigator.clipboard.writeText(u.email); }]);
    return list;
  }
  const cell = (u, k) => {
    if (k === 'createdAt' || k === 'lastLogin') return day(u[k]);
    if (k === 'orders') return u.orders == null ? '-' : u.orders;
    if (k === 'active') return u.active ? (u.mustChange ? 'temp password' : 'active') : 'switched off';
    if (k === 'phone') return u.phone || 'none';
    return u[k];
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>
        <thead>
          <tr>
            {COLS.map(([k, label]) => (
              <th key={k} style={th} onClick={() => setSort((s) => ({ k, d: s.k === k ? -s.d : 1 }))}>
                {label}{sort.k === k ? (sort.d === 1 ? ' \u25b2' : ' \u25bc') : ''}
              </th>
            ))}
            <th style={th} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((u) => (
            <tr key={u.id} onContextMenu={(e) => open(e, u)} style={{ opacity: u.active ? 1 : 0.5 }}>
              {COLS.map(([k]) => <td key={k} style={td}>{cell(u, k)}</td>)}
              <td style={td}><button type="button" className="line sm" aria-label="Actions" onClick={(e) => openFromButton(e, u)}>...</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sorted.length ? <p className="center muted">No one found.</p> : null}
      <p className="muted" style={{ fontSize: '12px' }}>Right-click a row (or tap the ... button) for actions. Tap a heading to sort.</p>
      {menu ? (
        <div style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 50, background: '#fff', border: '1px solid #bbb', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,.2)', minWidth: '200px', padding: '4px' }}>
          <div className="muted" style={{ padding: '4px 10px', fontSize: '12px' }}>{menu.u.name}</div>
          {items(menu.u).map(([label, fn]) => (
            <button key={label} type="button" onClick={() => { setMenu(null); fn(); }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '8px 10px', cursor: 'pointer', color: '#0b2a4a' }}>{label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
