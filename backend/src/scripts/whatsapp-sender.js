import { query } from '../db/pool.js';

// Shows messages waiting to be sent. The OpenWA sender is added once we know how you run OpenWA.
// Usage (from backend): node --env-file=.env src/scripts/whatsapp-sender.js --list
const { rows } = await query(
  `SELECT id, kind, to_phone, status, attempts, body, created_at FROM outbound_messages
    WHERE status IN ('queued','failed') ORDER BY created_at LIMIT 50`
);
if (!rows.length) console.log('Nothing waiting to be sent.');
for (const r of rows) {
  console.log('#' + r.id + ' [' + r.status + '] ' + r.kind + ' to ' + r.to_phone);
  console.log('   ' + r.body);
}
process.exit(0);
