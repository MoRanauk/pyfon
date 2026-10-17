import { parseArgs } from 'node:util';
import { pool, query } from '../db/pool.js';

// DEMO TOOL: moves a TEST customer's order job to a stage so you can watch the tracking line on the site.
// It edits job_steps directly and only works on orders of the test accounts listed below. Never use it on real orders.
//   node --env-file=.env src/scripts/demo-job-stage.js                              (lists test jobs)
//   node --env-file=.env src/scripts/demo-job-stage.js --ref JOB-000013 --stage working
// Stages: reset, received, working, done, ready, delivered
const TEST = ['test.customer@example.com', 'test.two@example.com', 'link.a@example.com', 'link.b@example.com'];
const STEPS = ['finance_quote', 'creative', 'production', 'finance_delivery'];
const STAGES = {
  reset: { s: ['active', 'waiting', 'waiting', 'waiting'], step: 'finance_quote', status: 'open' },
  received: { s: ['signed_off', 'active', 'waiting', 'waiting'], step: 'creative', status: 'open' },
  working: { s: ['signed_off', 'signed_off', 'active', 'waiting'], step: 'production', status: 'open' },
  done: { s: ['signed_off', 'signed_off', 'signed_off', 'active'], step: 'finance_delivery', status: 'open' },
  ready: { s: ['signed_off', 'signed_off', 'signed_off', 'awaiting_cosign'], step: 'finance_delivery', status: 'open' },
  delivered: { s: ['signed_off', 'signed_off', 'signed_off', 'signed_off'], step: 'done', status: 'complete' },
};
const { values } = parseArgs({ options: { ref: { type: 'string' }, stage: { type: 'string' } } });

try {
  if (!values.ref) {
    const { rows } = await query(
      `SELECT j.ref, o.ref AS order_ref, j.current_step, j.status, u.email
         FROM jobs j JOIN orders o ON o.id = j.order_id JOIN users u ON u.id = o.customer_id
        WHERE u.email = ANY($1) ORDER BY j.id DESC LIMIT 20`,
      [TEST]
    );
    if (!rows.length) console.log('No orders from the test accounts yet. Place a test order first.');
    for (const r of rows) console.log([r.ref, r.order_ref, r.current_step, r.status, r.email].join(' | '));
  } else {
    const def = STAGES[values.stage];
    if (!def) throw new Error('give --stage reset, received, working, done, ready or delivered');
    const found = await query(
      `SELECT j.id, j.ref FROM jobs j JOIN orders o ON o.id = j.order_id JOIN users u ON u.id = o.customer_id
        WHERE j.ref = $1 AND u.email = ANY($2)`,
      [values.ref, TEST]
    );
    if (!found.rows[0]) throw new Error('that job is not an order of a test account, so it was not touched');
    const id = found.rows[0].id;
    for (let i = 0; i < STEPS.length; i++) {
      await query(
        `UPDATE job_steps SET status = $3::text,
           signed_off_at = CASE WHEN $3::text = 'signed_off' THEN coalesce(signed_off_at, now()) ELSE NULL END
         WHERE job_id = $1 AND step = $2`,
        [id, STEPS[i], def.s[i]]
      );
    }
    await query(
      `UPDATE jobs SET current_step = $2, status = $3::text,
         completed_at = CASE WHEN $3::text = 'complete' THEN coalesce(completed_at, now()) ELSE NULL END WHERE id = $1`,
      [id, def.step, def.status]
    );
    console.log(values.ref + ' is now at: ' + values.stage + '. Refresh the Orders page.');
  }
} catch (e) {
  console.error('Error: ' + e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
