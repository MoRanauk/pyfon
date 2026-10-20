import { kes } from './api.js';

const n = (v) => Number(v).toLocaleString('en-KE');

export const MONEY_CSS = `
.mb{max-width:1100px;margin:0 auto;font-size:14px;text-align:left}
.mb h1{text-align:center}
.mb input,.mb select{width:auto!important;margin:0;padding:6px 8px;font-size:14px;border:1px solid #c8ccd2;border-radius:6px;background:#fff;min-width:0;box-sizing:border-box}
.mb input[type=date]{width:150px!important}
.mb .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin:8px 0}
.mb .chip{padding:5px 11px;border:1px solid #0b2a4a;border-radius:14px;background:#fff;color:#0b2a4a;cursor:pointer;font-size:13px}
.mb .chip.on{background:#0b2a4a;color:#fff}
.mb .sum{display:flex;flex-wrap:wrap;background:#fff;border:1px solid #e3e3e3;border-radius:10px;margin:10px 0}
.mb .sum div{flex:1 1 130px;padding:8px 12px;text-align:center;border-right:1px solid #eee}
.mb .sum small{display:block;color:#666;font-size:12px}
.mb .sum b{font-size:17px}
.mb .form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;background:#fff;border:1px solid #e3e3e3;border-radius:10px;padding:12px;margin:10px 0}
.mb .form input,.mb .form select{width:100%!important}
.mb .form .wide{grid-column:span 2}
.mb .hint{grid-column:1/-1;margin:0;font-size:12px;color:#666}
.mb .grid{overflow:auto;background:#fff;border:1px solid #d5d8dd;border-radius:8px;max-height:70vh}
.mb table{border-collapse:collapse;width:100%;min-width:780px;font-size:13px}
.mb th{position:sticky;top:0;background:#0b2a4a;color:#fff;text-align:left;padding:6px 8px;font-weight:600;white-space:nowrap}
.mb td{padding:5px 8px;border:1px solid #e6e8eb;white-space:nowrap}
.mb tbody tr:nth-child(even){background:#f7f8fa}
.mb tbody tr:hover{background:#fff7dc}
.mb .num{text-align:right;font-variant-numeric:tabular-nums}
.mb .in{color:#1b7a3a}.mb .out{color:#a02020}
.mb tfoot td{font-weight:700;background:#eef1f5}
.mb .ib{background:#fff;border:1px solid #c8ccd2;border-radius:6px;width:26px;height:26px;cursor:pointer;margin-left:4px;color:#0b2a4a}
.mb .note{color:#666;font-size:12px;text-align:center;margin:6px 0}
`;

export function Ledger({ entries, query, onReverse, onDelete }) {
  if (!entries.length) return <p style={{ textAlign: 'center' }}>No entries for these dates.</p>;
  const q = query.trim().toLowerCase();
  let bal = 0;
  const balOf = {};
  entries.slice().reverse().forEach((e) => {
    if (!e.deleted) bal += e.kind === 'income' ? e.amountKes : -e.amountKes;
    balOf[e.id] = bal;
  });
  const rows = entries.filter((e) => !q || [e.category, e.party, e.note, e.jobRef, e.by, e.date].join(' ').toLowerCase().includes(q));
  const live = rows.filter((e) => !e.deleted);
  const tin = live.filter((e) => e.kind === 'income').reduce((a, e) => a + e.amountKes, 0);
  const tout = live.filter((e) => e.kind === 'expense').reduce((a, e) => a + e.amountKes, 0);
  return (
    <>
      <div className="grid">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Job</th><th>Who</th><th>Note</th><th className="num">In</th><th className="num">Out</th><th className="num">Balance</th><th /></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} style={e.deleted ? { opacity: 0.45, textDecoration: 'line-through' } : e.reversesId ? { fontStyle: 'italic', color: '#666' } : undefined}>
                <td>{e.date}</td>
                <td>{e.kind === 'income' ? 'Income' : e.costType === 'direct' ? 'Direct' : 'Overhead'}</td>
                <td>{e.category}</td><td>{e.jobRef || ''}</td><td>{e.party || ''}</td>
                <td style={{ whiteSpace: 'normal', minWidth: '140px' }}>{e.note || ''}</td>
                <td className="num in">{e.kind === 'income' ? n(e.amountKes) : ''}</td>
                <td className="num out">{e.kind === 'expense' ? n(e.amountKes) : ''}</td>
                <td className="num">{e.deleted ? '' : n(balOf[e.id])}</td>
                <td style={{ textAlign: 'right' }}>
                  {!e.deleted && !e.reversesId ? <button type="button" className="ib" title="Reverse: adds an opposite entry" onClick={() => onReverse(e.id)}>{'\u21A9'}</button> : null}
                  {!e.deleted ? <button type="button" className="ib" title="Ask to delete: all three partners must approve" onClick={() => onDelete(e.id)}>{'\u2715'}</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={6}>Totals ({live.length} entries)</td><td className="num in">{n(tin)}</td><td className="num out">{n(tout)}</td><td className="num">{n(tin - tout)}</td><td /></tr></tfoot>
        </table>
      </div>
      <p className="note">Amounts in KES. Balance runs through the dates you chose.</p>
    </>
  );
}

export function CategoryTable({ rows }) {
  if (!rows.length) return <p style={{ textAlign: 'center' }}>Nothing recorded for these dates.</p>;
  const groups = [
    ['Income', (r) => r.kind === 'income'],
    ['Direct costs', (r) => r.kind === 'expense' && r.cost_type === 'direct'],
    ['Overheads', (r) => r.kind === 'expense' && r.cost_type !== 'direct'],
  ];
  return (
    <div className="grid">
      <table style={{ minWidth: 0 }}>
        <thead><tr><th>Category</th><th className="num">KES</th></tr></thead>
        <tbody>
          {groups.map(([name, test]) => {
            const part = rows.filter(test);
            if (!part.length) return null;
            return [<tr key={name}><td colSpan={2} style={{ fontWeight: 700, background: '#eef1f5' }}>{name}</td></tr>]
              .concat(part.map((r) => <tr key={name + r.category}><td>{r.category}</td><td className="num">{n(r.total)}</td></tr>))
              .concat([<tr key={name + 't'}><td style={{ fontWeight: 700 }}>Total {name.toLowerCase()}</td><td className="num" style={{ fontWeight: 700 }}>{n(part.reduce((a, r) => a + r.total, 0))}</td></tr>]);
          })}
        </tbody>
      </table>
    </div>
  );
}

export function JobTable({ jobs }) {
  if (!jobs.length) return <p style={{ textAlign: 'center' }}>No job-linked entries yet. Add a job reference to an entry.</p>;
  return (
    <div className="grid">
      <table style={{ minWidth: 0 }}>
        <thead><tr><th>Job</th><th className="num">Income</th><th className="num">Costs</th><th className="num">Profit</th></tr></thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.jobRef}>
              <td>{j.jobRef}</td><td className="num">{n(j.income)}</td><td className="num">{n(j.cost)}</td>
              <td className={'num ' + (j.profit < 0 ? 'out' : 'in')} style={{ fontWeight: 700 }}>{kes(j.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
