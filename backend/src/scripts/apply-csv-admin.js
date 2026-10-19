import fs from 'node:fs';
let bad = 0;
function patch(file, old, neu, label) {
  const t = fs.readFileSync(file, 'utf8');
  if (t.includes(neu)) { console.log('Already done: ' + label); return; }
  if (!t.includes(old)) { console.log('NOT FOUND: ' + label); bad++; return; }
  fs.writeFileSync(file, t.replace(old, () => neu));
  console.log('Patched: ' + label);
}
const g = 'src/routes/groups.js';
patch(g, "import { partnerSendRoutes } from './partnerSend.js';", "import { partnerSendRoutes } from './partnerSend.js';\nimport { partnerCsvRoutes } from './partnerCsv.js';", 'groups import');
patch(g, 'partnerRoutes.use(partnerSendRoutes);', 'partnerRoutes.use(partnerSendRoutes);\npartnerRoutes.use(partnerCsvRoutes);', 'groups mount');
patch('src/routes/partnerApprovals.js', "z.enum(['price_change', 'product_delete', 'invoice_discount'])", "z.enum(['price_change', 'product_delete', 'invoice_discount', 'csv_import'])", 'approvals enum');
const a = 'src/approvals/actions.js';
patch(a, "import { HttpError } from '../errors.js';", "import { HttpError } from '../errors.js';\nimport { applyCsv } from '../csv/importer.js';", 'actions import');
patch(a, '  product_delete: {', fs.readFileSync('src/scripts/csv-action.txt', 'utf8') + '  product_delete: {', 'actions csv_import');
patch('src/routes/partnerActivity.js', "'connect.sent': 'sent a message via',", "'connect.sent': 'sent a message via',\n  'catalog.csv_submitted': 'uploaded a product file for approval', 'catalog.csv_exported': 'exported the product list',", 'activity wording');
patch('src/scripts/import-products.js', "await client.query('BEGIN');", "await client.query('BEGIN');\n    await client.query(\"SELECT set_config('pyfon.csv_import', 'on', true)\");", 'CLI guard flag');
process.exit(bad ? 1 : 0);
