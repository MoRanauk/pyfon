import fs from 'fs';
import path from 'path';
let bad = false;
function patch(file, pairs) {
  const p = path.resolve(process.cwd(), file);
  let s = fs.readFileSync(p, 'utf8');
  for (const [a, b, mark] of pairs) {
    if (s.includes(mark)) { console.log('Already done: ' + mark); continue; }
    if (!s.includes(a)) { console.log('NOT FOUND: ' + a.slice(0, 60)); bad = true; continue; }
    s = s.replace(a, () => b);
    console.log('Patched: ' + mark);
  }
  fs.writeFileSync(p, s);
}
patch('../apps/m3labs/src/App.jsx', [
  ["import DevReports from './DevReports.jsx';", "import DevReports from './DevReports.jsx';\nimport Money from './Money.jsx';", 'import Money from'],
  ['<Route path="/reports" element={<DevReports />} />', '<Route path="/reports" element={<DevReports />} />\n        <Route path="/money" element={<Money />} />', 'path="/money"'],
]);
patch('../apps/m3labs/src/helpTopics.js', [
  ["'/activity': { title: 'Activity log'", "'/money': { title: 'Money book', text: 'Record income and costs. Link a cost to a job to see that job profit. Entries cannot be edited: reverse a wrong one, or ask to delete it, which needs all three partners.' },\n  '/activity': { title: 'Activity log'", "'/money'"],
]);
patch('../apps/m3labs/src/helpTours.js', [
  ["'/reports': [", "'/money': [\n    { sel: '.page', title: 'Money book', text: 'Totals for the dates you choose: income, direct costs, gross profit, overheads and net profit.' },\n    { sel: '.page input', title: 'Add an entry', text: 'Choose income or expense, the amount, and a job reference if it belongs to a job.' },\n    { sel: '.page table', title: 'The entries', text: 'Entries cannot be edited. Reverse a wrong one, or ask to delete it, which needs all three partners.' },\n  ],\n  '/reports': [", "'/money'"],
]);
process.exit(bad ? 1 : 0);
