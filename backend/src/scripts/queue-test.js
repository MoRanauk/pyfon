import { query } from '../db/pool.js';
import { toWaNumber } from '../messages/queue.js';

// Queues one test message. From backend:
//   node --env-file=.env src/scripts/queue-test.js 0712345678
const to = toWaNumber(process.argv[2]);
if (to.length < 10) {
  console.error('Give a phone number, for example 0712345678.');
  process.exit(1);
}
await query(
  `INSERT INTO outbound_messages (kind, to_phone, body) VALUES ('custom', $1, $2)`,
  [to, 'Test from Pyfon Brands: if you can read this, automatic messages work.']
);
console.log('Queued a test message to ' + to);
process.exit(0);
