import { kes } from './api.js';

const th = { textAlign: 'left', padding: '6px', borderBottom: '2px solid #c9a227', fontSize: '12px', textTransform: 'uppercase' };
const td = { padding: '6px', borderBottom: '1px solid #eee', verticalAlign: 'top' };

export function EntryTable({ entries, onReverse, onDelete }) {
  if (!entries.length) return <p>No entries for these dates.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Date', 'Type', 'Category', 'Job', 'Who', 'Amount', 'Note', 'By', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} style={e.deleted ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
              <td style={td}>{e.date}</td>
              <td style={td}>{e.kind === 'income' ? 'Income' : e.costType === 'direct' ? 'Direct cost' : 'Overhead'}</td>
              <td style={td}>{e.category}</td>
              <td style={td}>{e.jobRef || ''}</td>
              <td style={td}>{e.party || ''}</td>
              <td style={{ ...td, whiteSpace: 'nowrap', color: e.kind === 'income' ? '#1b7a3a' : '#a02020' }}>{kes(e.amountKes)}</td>
              <td style={td}>{e.note || ''}</td>
              <td style={td}>{e.by || ''}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                {!e.deleted && !e.reversesId ? <button type="button" onClick={() => onReverse(e.id)}>Reverse</button> : null}{' '}
                {!e.deleted ? <button type="button" onClick={() => onDelete(e.id)}>Ask to delete</button> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function JobTable({ jobs }) {
  if (!jobs.length) return <p>No job-linked entries yet. Add a job reference to an entry.</p>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{['Job', 'Income', 'Costs', 'Profit'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.jobRef}>
              <td style={td}>{j.jobRef}</td><td style={td}>{kes(j.income)}</td><td style={td}>{kes(j.cost)}</td>
              <td style={{ ...td, fontWeight: 700, color: j.profit < 0 ? '#a02020' : '#1b7a3a' }}>{kes(j.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
