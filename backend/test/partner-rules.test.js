// Partner-rule tests. Run with run-tests.ps1 (it sets the logins) while "npm run dev" is running.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/pool.js';

const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const E = process.env;
const need = ['PB_CUST_EMAIL', 'PB_CUST_PW', 'PB_DEV_EMAIL', 'PB_DEV_PW',
  'PB_CREATIVE_EMAIL', 'PB_CREATIVE_PW', 'PB_PRODUCTION_EMAIL', 'PB_PRODUCTION_PW',
  'PB_FINANCE_EMAIL', 'PB_FINANCE_PW'];

async function api(method, path, iface, token, body) {
  const headers = { 'X-Interface': iface };
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

function expectErr(r, status, code) {
  assert.equal(r.status, status, 'expected ' + status + ' got ' + r.status + ': ' + r.text);
  if (code) assert.equal(r.json?.error?.code, code, r.text);
}
function expectOk(r, status = 200) {
  assert.equal(r.status, status, 'expected ' + status + ' got ' + r.status + ': ' + r.text);
}

const tokens = {};
async function login(email, pw, iface) {
  const key = email + '|' + iface;
  if (tokens[key]) return tokens[key];
  const r = await api('POST', '/v1/auth/login', iface, null, { email, password: pw });
  assert.equal(r.status, 200, 'login failed for ' + email + ' on ' + iface + ': ' + r.text);
  assert.ok(!r.json.mustChangePassword, email + ' must change password first');
  tokens[key] = r.json.token;
  return r.json.token;
}

const P = {
  creative: { email: E.PB_CREATIVE_EMAIL, pw: E.PB_CREATIVE_PW },
  production: { email: E.PB_PRODUCTION_EMAIL, pw: E.PB_PRODUCTION_PW },
  finance: { email: E.PB_FINANCE_EMAIL, pw: E.PB_FINANCE_PW },
};
const IFACE = { creative: 'm3-creative', production: 'm3-production', finance: 'm3-finance' };
const tok = (who, iface) => login(P[who].email, P[who].pw, iface || IFACE[who]);
const cred = (who) => ({ email: P[who].email, password: P[who].pw });

let cust, dev;
async function newOrderJob() {
  const r = await api('POST', '/v1/customer/orders', 'mco', cust, {
    contactName: 'Test Tester', contactPhone: '0794802462',
    lines: [{ sku: 'PB-DRK-001', qty: 1 }],
  });
  expectOk(r, 201);
  const m = r.text.match(/JOB-\d+/);
  assert.ok(m, 'no job ref in order response: ' + r.text);
  return m[0];
}
async function getJob(ref) {
  const r = await api('GET', '/v1/partner/jobs/' + ref, 'm3-finance', await tok('finance'));
  expectOk(r);
  return r.json;
}
async function userId(email) {
  const { rows } = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0].id;
}

before(async () => {
  const missing = need.filter((k) => !E[k]);
  assert.equal(missing.length, 0, 'Missing logins: ' + missing.join(', ') + '. Start with .\\run-tests.ps1');
  cust = await login(E.PB_CUST_EMAIL, E.PB_CUST_PW, 'mco');
  dev = await login(E.PB_DEV_EMAIL, E.PB_DEV_PW, 'dev');
});
after(async () => { await pool.end(); });

describe('Job A: full workflow, cover, co-sign rules, guards', () => {
  let job;

  it('creates a job from an order', async () => { job = await newOrderJob(); });

  it('refuses a sign-off in the wrong workspace (wrong_workspace)', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-creative', await tok('creative'), {});
    expectErr(r, 409, 'wrong_workspace');
  });

  it('cover: creative partner signs in the finance workspace and it is logged as acting for finance', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-finance', await tok('creative', 'm3-finance'), {});
    expectOk(r);
    assert.equal(r.json.stepStatus, 'awaiting_cosign');
    const { rows } = await pool.query(
      "SELECT actor_user_id, acting_for_user_id FROM audit_log WHERE action = 'job.owner_signed' AND entity_id = $1", [job]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].actor_user_id, await userId(P.creative.email));
    assert.equal(rows[0].acting_for_user_id, await userId(P.finance.email));
  });

  it('one person cannot give both signatures (same_person)', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/cosign', 'm3-finance', await tok('creative', 'm3-finance'), cred('creative'));
    expectErr(r, 409, 'same_person');
  });

  it('live approval cannot be requested from your own stage (no_partner)', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/cosign-request', 'm3-finance', await tok('creative', 'm3-finance'), { toStage: 'creative' });
    expectErr(r, 404, 'no_partner');
  });

  it('co-sign with a wrong password is refused', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/cosign', 'm3-finance', await tok('creative', 'm3-finance'),
      { email: P.production.email, password: 'definitely-wrong-password' });
    expectErr(r, 401, 'cosign_credentials_invalid');
  });

  it('a different partner co-signs with their own password; job moves to creative', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/cosign', 'm3-finance', await tok('creative', 'm3-finance'), cred('production'));
    expectOk(r);
    assert.equal(r.json.jobNow, 'creative');
  });

  it('finance workspace can no longer act on it (wrong_workspace)', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-finance', await tok('finance'), {});
    expectErr(r, 409, 'wrong_workspace');
  });

  it('creative step: owner signs, then a live approval from another device', async () => {
    const t = await tok('creative');
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-creative', t, {}));
    const req = await api('POST', '/v1/partner/jobs/' + job + '/cosign-request', 'm3-creative', t, { toStage: 'finance' });
    expectOk(req, 201);
    const ft = await tok('finance');
    const list = await api('GET', '/v1/partner/cosign-requests', 'm3-finance', ft);
    expectOk(list);
    assert.ok(list.json.requests.some((x) => String(x.id) === String(req.json.requestId)));
    const ok = await api('POST', '/v1/partner/cosign-requests/' + req.json.requestId + '/approve', 'm3-finance', ft, {});
    expectOk(ok);
    assert.equal(ok.json.jobNow, 'production');
  });

  it('production cannot be signed until a mode is chosen (production_not_assigned)', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-production', await tok('production'), {});
    expectErr(r, 409, 'production_not_assigned');
  });

  it('production: choose in-house, sign, co-sign; job moves to finance delivery and is still open', async () => {
    const t = await tok('production');
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/production', 'm3-production', t, { mode: 'in_house' }));
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-production', t, {}));
    const r = await api('POST', '/v1/partner/jobs/' + job + '/cosign', 'm3-production', t, cred('finance'));
    expectOk(r);
    assert.equal(r.json.jobNow, 'finance_delivery');
    const d = await getJob(job);
    assert.equal(d.job.status, 'open');
  });

  it('three-key completion: only after the fourth sign-off is the job complete', async () => {
    const t = await tok('finance');
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-finance', t, {}));
    const r = await api('POST', '/v1/partner/jobs/' + job + '/cosign', 'm3-finance', t, cred('creative'));
    expectOk(r);
    assert.equal(r.json.jobNow, 'complete');
    const d = await getJob(job);
    assert.equal(d.job.status, 'complete');
    assert.equal(d.steps.length, 4);
    assert.ok(d.steps.every((s) => s.status === 'signed_off'));
  });

  it('a completed job cannot be signed again (job_closed)', async () => {
    const r = await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-finance', await tok('finance'), {});
    expectErr(r, 409, 'job_closed');
  });
});

describe('Job B: rejection resets the job', () => {
  it('needs a reason, then sends the job back and voids the signatures', async () => {
    const job = await newOrderJob();
    const ft = await tok('finance');
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-finance', ft, {}));
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/cosign', 'm3-finance', ft, cred('creative')));
    const ct = await tok('creative');
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-creative', ct, {}));

    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/reject', 'm3-creative', ct, {}), 400, 'validation_failed');
    const r = await api('POST', '/v1/partner/jobs/' + job + '/reject', 'm3-creative', ct,
      { reason: 'Quote needs checking again', sendBackTo: 'finance_quote' });
    expectOk(r);
    assert.equal(r.json.sentBackTo, 'finance_quote');

    const d = await getJob(job);
    assert.equal(d.job.currentStep, 'finance_quote');
    const by = Object.fromEntries(d.steps.map((s) => [s.step, s.status]));
    assert.equal(by.finance_quote, 'active');
    assert.equal(by.creative, 'waiting');
    assert.equal(d.signatures.length, 0);
    assert.equal(d.rejections.length, 1);
  });
});

describe('Job C: quote price guard', () => {
  let job;
  it('refuses the quote step until Finance sets a price', async () => {
    const q = await api('POST', '/v1/customer/quote-requests', 'mco', cust,
      { kind: 'design', contactName: 'Test Tester', contactPhone: '0794802462', notes: 'Automated test' });
    expectOk(q, 201);
    job = (q.text.match(/JOB-\d+/) || [])[0];
    assert.ok(job, 'no job ref in quote response: ' + q.text);
    const ft = await tok('finance');
    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-finance', ft, {}), 409, 'quote_price_missing');
    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/quote-price', 'm3-finance', ft, { priceKes: 'abc' }), 400, 'validation_failed');
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/quote-price', 'm3-finance', ft, { priceKes: 1500 }));
    expectOk(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'm3-finance', ft, {}));
  });

  it('the developer cannot sign off, price, or upload job files', async () => {
    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/sign-off', 'dev', dev, {}), 403);
    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/cosign', 'dev', dev, cred('creative')), 403);
    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/reject', 'dev', dev, { reason: 'nope nope' }), 403);
    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/quote-price', 'dev', dev, { priceKes: 1 }), 403);
    expectErr(await api('POST', '/v1/partner/jobs/' + job + '/files', 'dev', dev, {}), 403);
  });
});

describe('Three-partner approvals', () => {
  let id, price;

  it('executes only after all three partners approve; developer is refused', async () => {
    price = (await pool.query("SELECT price_kes FROM catalog_items WHERE sku = 'PB-DRK-001'")).rows[0].price_kes;
    const ft = await tok('finance'), ct = await tok('creative'), pt = await tok('production');

    // Same price as today, so real data is not changed.
    const c = await api('POST', '/v1/partner/approvals', 'm3-finance', ft, { action: 'price_change', payload: { sku: 'PB-DRK-001', priceKes: price } });
    expectOk(c, 201);
    id = c.json.request.id;
    assert.equal(c.json.request.status, 'pending');

    expectErr(await api('POST', '/v1/partner/approvals', 'dev', dev, { action: 'price_change', payload: { sku: 'PB-DRK-001', priceKes: price } }), 403);
    expectErr(await api('POST', '/v1/partner/approvals/' + id + '/vote', 'dev', dev, { vote: 'approve' }), 403);
    expectErr(await api('POST', '/v1/partner/approvals/' + id + '/vote', 'm3-finance', ft, { vote: 'approve' }), 409, 'already_voted');

    const v1 = await api('POST', '/v1/partner/approvals/' + id + '/vote', 'm3-creative', ct, { vote: 'approve' });
    expectOk(v1);
    assert.equal(v1.json.request.status, 'pending');
    const v2 = await api('POST', '/v1/partner/approvals/' + id + '/vote', 'm3-production', pt, { vote: 'approve' });
    expectOk(v2);
    assert.equal(v2.json.request.status, 'executed');

    const after = (await pool.query("SELECT price_kes FROM catalog_items WHERE sku = 'PB-DRK-001'")).rows[0].price_kes;
    assert.equal(after, price);
  });

  it('one reject vote stops it; only the requester can cancel', async () => {
    const ft = await tok('finance'), ct = await tok('creative'), pt = await tok('production');
    const c = await api('POST', '/v1/partner/approvals', 'm3-finance', ft, { action: 'price_change', payload: { sku: 'PB-DRK-001', priceKes: price } });
    expectOk(c, 201);
    const rid = c.json.request.id;
    expectErr(await api('POST', '/v1/partner/approvals/' + rid + '/vote', 'm3-creative', ct, { vote: 'reject' }), 400, 'reason_required');
    const rej = await api('POST', '/v1/partner/approvals/' + rid + '/vote', 'm3-creative', ct, { vote: 'reject', reason: 'Not agreed yet' });
    expectOk(rej);
    assert.equal(rej.json.request.status, 'rejected');
    expectErr(await api('POST', '/v1/partner/approvals/' + rid + '/vote', 'm3-production', pt, { vote: 'approve' }), 409, 'not_pending');
    expectErr(await api('POST', '/v1/partner/approvals/' + rid + '/cancel', 'm3-creative', ct, {}), 403, 'not_requester');
  });
});

describe('Upload checks', () => {
  async function upload(bytes, type, name) {
    const fd = new FormData();
    fd.append('file', new Blob([bytes], { type }), name);
    fd.append('purpose', 'personalization');
    const res = await fetch(BASE + '/v1/customer/uploads', {
      method: 'POST', headers: { 'X-Interface': 'mco', Authorization: 'Bearer ' + cust }, body: fd,
    });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* */ }
    return { status: res.status, json, text };
  }

  it('refuses a text file pretending to be a PNG (file_type_not_allowed)', async () => {
    expectErr(await upload(Buffer.from('this is not an image'), 'image/png', 'fake.png'), 415, 'file_type_not_allowed');
  });

  it('refuses a file that is too large (file_too_large)', async () => {
    expectErr(await upload(Buffer.alloc(11 * 1024 * 1024), 'image/png', 'big.png'), 413, 'file_too_large');
  });
});
