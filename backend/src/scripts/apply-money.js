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
patch('src/routes/groups.js', [
  ["import { reportRoutes } from './reports.js';", "import { reportRoutes } from './reports.js';\nimport { partnerMoneyRoutes } from './partnerMoney.js';", 'import { partnerMoneyRoutes }'],
  ['partnerRoutes.use(reportRoutes);', 'partnerRoutes.use(reportRoutes);\npartnerRoutes.use(partnerMoneyRoutes);', 'partnerRoutes.use(partnerMoneyRoutes)'],
]);
patch('src/routes/partnerApprovals.js', [
  ["'invoice_discount', 'csv_import']),", "'invoice_discount', 'csv_import', 'money_delete']),", "'money_delete']"],
]);
process.exit(bad ? 1 : 0);
