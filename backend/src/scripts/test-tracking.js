import { buildStages } from '../jobs/tracking.js';

// Checks the tracking line logic. No database needed. From backend: node src/scripts/test-tracking.js
const S = (a, b, c, d) => ({ finance_quote: { status: a }, creative: { status: b }, production: { status: c }, finance_delivery: { status: d } });
const base = { createdAt: '2026-10-17T10:00:00Z', deliveryMethod: 'pickup', jobStatus: 'open', readyAt: null, completedAt: null };
let bad = 0;
function check(label, got, want) {
  if (got === want) console.log('PASS  ' + label);
  else { bad++; console.log('FAIL  ' + label + ' (got ' + got + ', wanted ' + want + ')'); }
}
const run = (steps, extra) => buildStages({ ...base, steps, ...(extra || {}) });

let t = run(S('active', 'waiting', 'waiting', 'waiting'));
check('new order is Pending', t.currentKey, 'pending');
check('Order Made is done', t.stages[0].state, 'done');
check('there are 7 stages', t.stages.length, 7);
check('Delivered is still to do', t.stages[6].state, 'todo');
check('no steps at all is Pending', run({}).currentKey, 'pending');
check('finance signed off is Received', run(S('signed_off', 'active', 'waiting', 'waiting')).currentKey, 'received');
check('creative half-signed is still Received', run(S('signed_off', 'awaiting_cosign', 'waiting', 'waiting')).currentKey, 'received');
check('creative signed off is Being Worked On', run(S('signed_off', 'signed_off', 'active', 'waiting')).currentKey, 'working');
check('production signed off is Done', run(S('signed_off', 'signed_off', 'signed_off', 'active')).currentKey, 'done');
check('pickup label', run(S('signed_off', 'signed_off', 'signed_off', 'awaiting_cosign')).currentLabel, 'Ready for Pick Up');
check('delivery label', run(S('signed_off', 'signed_off', 'signed_off', 'awaiting_cosign'), { deliveryMethod: 'nairobi' }).currentLabel, 'Ready for Delivery');
t = run(S('signed_off', 'signed_off', 'signed_off', 'signed_off'), { jobStatus: 'complete' });
check('complete job is Collected', t.currentLabel, 'Collected');
check('last stage shows as done', t.stages[6].state, 'done');
check('sent back to creative moves the line back', run(S('signed_off', 'active', 'waiting', 'waiting')).currentKey, 'received');
check('sent back to finance moves the line back', run(S('active', 'waiting', 'waiting', 'waiting')).currentKey, 'pending');
console.log(bad ? 'Some checks failed' : 'All checks passed');
process.exitCode = bad ? 1 : 0;
