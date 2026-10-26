import { useCallback, useEffect, useState } from 'react';
import { get } from './http.js';
import { STAGE } from './api.js';

const R = (STAGE === 'dev' ? '/v1/dev' : '/v1/partner') + '/reports';
const DAYS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '1 year']];
const MODES = [['day', 'By day'], ['week', 'By week'], ['month', 'By month']];
const WAIT = [['24', 'Over 1 day'], ['72', 'Over 3 days'], ['168', 'Over 7 days']];
const STEP = { finance_quote: 'Quote (Finance)', creative: 'Creative', production: 'Production', finance_delivery: 'Delivery (Finance)' };
const OWNER = { creative: 'Partner 1 (Creative)', production: 'Partner 2 (Production)', finance: 'Partner 3 (Finance)' };
const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const dayOf = (v) => String(v).slice(0, 10);

function group(rows, mode) {
  const m = new Map();
  rows.forEach((r) => {
    const k = dayOf(r.day);
    let key = k;
    if (mode === 'month') key = k.slice(0, 7);
    if (mode === 'week') {
      const d = new Date(k + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      key = d.toISOString().slice(0, 10);
    }
    const o = m.get(key) || { label: key, orders: 0, totalKes: 0 };
    o.orders += r.orders;
    o.totalKes += r.totalKes;
    m.set(key, o);
  });
  return [...m.values()];
}

function csv(name, head, rows) {
  const esc = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
  const t = [head.map(esc).join(',')].concat(rows.map((r) => r.map(esc).join(','))).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' }));
  a.download = name + '.csv';
  a.click();
}

function Pick({ list, val, set }) {
  return (
    <div className="actbar" style={{ justifyContent: 'center' }}>
      {list.map(([v, l]) => <button key={v} type="button" className={val === v ? 'btn' : 'line'} onClick={() => set(v)}>{l}</button>)}
    </div>
  );
}

function Chart({ rows }) {
  const W = 720;
  const H = 140;
  const max = Math.max(1, ...rows.map((r) => r.totalKes));
  const bw = W / rows.length;
  const step = Math.max(1, Math.ceil(rows.length / 8));
  return (
    <svg viewBox={'0 0 ' + W + ' ' + (H + 22)} style={{ width: '100%' }} role="img" aria-label="Sales chart">
      <text x="0" y="10" fontSize="10" fill="#666">{kes(max)}</text>
      {rows.map((r, i) => {
        const h = (r.totalKes / max) * H;
        return (
          <g key={i}>
            <title>{r.label + ': ' + r.orders + ' orders, ' + kes(r.totalKes)}</title>
            <rect x={i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} fill="#0b2a4a" />
            {i % step === 0 ? <text x={i * bw} y={H + 16} fontSize="10" fill="#666">{r.label.length > 7 ? r.label.slice(5) : r.label}</text> : null}
          </g>
        );
      })}
      <line x1="0" y1={H} x2={W} y2={H} stroke="#999" />
    </svg>
  );
}

function Table({ name, head, rows }) {
  if (!rows.length) return <p className="muted center">Nothing yet.</p>;
  const cell = { padding: '4px 6px', borderBottom: '1px solid #eee' };
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead><tr>{head.map((h) => <th key={h} style={{ ...cell, textAlign: 'left', borderBottom: '1px solid #ccc' }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, n) => <td key={n} style={cell}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="actbar" style={{ justifyContent: 'center' }}>
        <button type="button" className="line" onClick={() => csv(name, head, rows)}>Download CSV</button>
      </div>
    </div>
  );
}

const SHOP = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };

export default function DevReports() {
  const [days, setDays] = useState('30');
  const [mode, setMode] = useState('day');
  const [hours, setHours] = useState('24');
  const [s, setS] = useState(null);
  const [j, setJ] = useState(null);
  const [w, setW] = useState(null);
  const [err, setErr] = useState('');
  const loadSales = useCallback(async () => {
    try { setErr(''); setS(await get(R + '/sales?days=' + days)); } catch (e) { setErr(e.message); }
  }, [days]);
  const loadWait = useCallback(async () => {
    try { setErr(''); setW(await get(R + '/stuck?hours=' + hours)); } catch (e) { setErr(e.message); }
  }, [hours]);
  const loadJobs = useCallback(async () => {
    try { setErr(''); setJ(await get(R + '/jobs-per-stage')); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { loadSales(); }, [loadSales]);
  useEffect(() => { loadWait(); }, [loadWait]);
  useEffect(() => { loadJobs(); }, [loadJobs]);

  const rows = s ? group(s.ordersByDay, mode) : [];
  const orders = s ? s.ordersByStorefront.reduce((a, r) => a + r.orders, 0) : 0;
  const money = s ? s.ordersByStorefront.reduce((a, r) => a + r.totalKes, 0) : 0;
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">Reports</h1>
      <p className="center muted">Sales, jobs per stage, and jobs waiting on a partner.</p>
      {err ? <p className="err center">{err}</p> : null}

      <section className="card">
        <h2>Sales</h2>
        <Pick list={DAYS} val={days} set={setDays} />
        {!s ? <p className="muted center">Loading...</p> : (
          <>
            <div className="mrow"><span className="grow">Orders placed</span><b>{orders}</b></div>
            <div className="mrow"><span className="grow">Total value</span><b>{kes(money)}</b></div>
            <Pick list={MODES} val={mode} set={setMode} />
            {rows.length ? <Chart rows={rows} /> : <p className="muted center">No orders in this period.</p>}
            <Table name={'sales-' + mode} head={['Period', 'Orders', 'Total (KES)']} rows={rows.map((r) => [r.label, r.orders, r.totalKes])} />
            <h3>By shop</h3>
            <Table name="sales-by-shop" head={['Shop', 'Orders', 'Total (KES)']} rows={s.ordersByStorefront.map((r) => [SHOP[r.storefront] || r.storefront, r.orders, r.totalKes])} />
            <h3>Top products</h3>
            <Table name="top-products" head={['Product', 'Qty sold', 'Total (KES)']} rows={s.topItems.map((r) => [r.name, r.qty, r.totalKes])} />
            <h3>Quote requests</h3>
            <Table name="quote-requests" head={['Kind', 'Status', 'Count']} rows={s.quoteRequests.map((r) => [r.kind, r.status, r.count])} />
          </>
        )}
      </section>

      <section className="card">
        <h2>Jobs per stage</h2>
        {!j ? <p className="muted center">Loading...</p> : (
          <>
            <h3>Open jobs by step</h3>
            <Table name="jobs-open-by-step" head={['Step', 'Open jobs']} rows={j.openByStep.map((r) => [STEP[r.step] || r.step, r.count])} />
            <h3>All jobs by status</h3>
            <Table name="jobs-by-status" head={['Status', 'Jobs']} rows={j.byStatus.map((r) => [r.status, r.count])} />
            <h3>Step progress (open jobs)</h3>
            <Table name="jobs-step-status" head={['Step', 'Status', 'Jobs']} rows={j.openStepStatus.map((r) => [STEP[r.step] || r.step, r.status, r.count])} />
          </>
        )}
      </section>

      <section className="card">
        <h2>Jobs waiting on a partner</h2>
        <Pick list={WAIT} val={hours} set={setHours} />
        {!w ? <p className="muted center">Loading...</p> : (
          <Table
            name="jobs-waiting"
            head={['Job', 'Step', 'Waiting on', 'Days waiting']}
            rows={w.jobs.map((r) => [r.jobRef, STEP[r.step] || r.step, OWNER[r.waitingOnStage] || '-', (r.hoursWaiting / 24).toFixed(1)])}
          />
        )}
      </section>
    </div>
  );
}
