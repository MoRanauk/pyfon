import { API_URL, IFACE, tokens, P } from './api.js';

export async function call(method, path, body) {
  const res = await fetch(API_URL + P + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Interface': IFACE, Authorization: 'Bearer ' + (tokens.get() || '') },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || 'Something went wrong (' + res.status + ')');
  return data;
}
export const CATS = {
  income: ['Sales', 'Design fees', 'Other income'],
  expense: ['Materials', 'Dealer payment', 'Printing supplies', 'Delivery', 'Rent', 'Utilities', 'Salaries', 'Marketing', 'Airtime and internet', 'Equipment', 'Other'],
};
export const today = () => new Date().toISOString().slice(0, 10);
export const monthStart = () => today().slice(0, 8) + '01';
export function downloadCsv(entries) {
  const head = ['id', 'date', 'type', 'category', 'cost type', 'amount kes', 'job', 'who', 'note', 'entered by', 'deleted'];
  const q = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';
  const rows = entries.map((e) => [e.id, e.date, e.kind, e.category, e.costType, e.amountKes, e.jobRef, e.party, e.note, e.by, e.deleted ? 'yes' : '']);
  const text = [head].concat(rows).map((r) => r.map(q).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = 'money-book.csv';
  a.click();
}
