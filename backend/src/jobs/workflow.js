import { query } from '../db/pool.js';
import { withTransaction } from '../db/tx.js';
import { HttpError } from '../errors.js';
import { audit } from '../audit.js';
import { verifyPassword, DUMMY_HASH } from '../auth/password.js';
import { STEPS } from './createJob.js';

// Which partner stage owns each step of a job.
export const STEP_STAGE = {
  finance_quote: 'finance',
  creative: 'creative',
  production: 'production',
  finance_delivery: 'finance',
};
const WORKSPACE_BY_INTERFACE = { 'm3-creative': 'creative', 'm3-production': 'production', 'm3-finance': 'finance' };

export const stepsOfStage = (stage) => STEPS.filter((s) => STEP_STAGE[s] === stage);

export function workspaceOf(req) {
  const w = WORKSPACE_BY_INTERFACE[req.interfaceCode];
  if (!w) throw new HttpError(403, 'no_workspace', 'This interface has no stage workspace');
  return w;
}

// Locks the job row so two people cannot change it at the same moment.
async function lockJob(client, ref, workspace) {
  const { rows } = await client.query('SELECT id, ref, status, current_step FROM jobs WHERE ref = $1 FOR UPDATE', [ref]);
  const job = rows[0];
  if (!job) throw new HttpError(404, 'job_not_found', 'Job not found');
  if (job.status !== 'open') throw new HttpError(409, 'job_closed', 'This job is already ' + job.status);
  if (STEP_STAGE[job.current_step] !== workspace) {
    throw new HttpError(409, 'wrong_workspace', 'This job is waiting in the ' + STEP_STAGE[job.current_step] + ' workspace');
  }
  const s = await client.query('SELECT status FROM job_steps WHERE job_id = $1 AND step = $2', [job.id, job.current_step]);
  job.step_status = s.rows[0].status;
  return job;
}

// If the signed-in partner is working in another partner's workspace, return that partner's id (the cover rule).
async function actingFor(client, req, workspace) {
  if (req.user.stage === workspace) return null;
  const { rows } = await client.query(
    "SELECT id FROM users WHERE role = 'partner' AND partner_stage = $1 AND is_active",
    [workspace]
  );
  return rows[0]?.id ?? null;
}

// First signature: the partner doing the work (or covering for them).
export async function ownerSignOff(req, ref) {
  const workspace = workspaceOf(req);
  const out = await withTransaction(async (client) => {
    const job = await lockJob(client, ref, workspace);
    if (job.step_status !== 'active') throw new HttpError(409, 'not_ready', 'This step is not waiting for a first signature');
    await client.query(
      `INSERT INTO job_signatures (job_id, step, role, partner_id, signer_stage, workspace_stage, method)
       VALUES ($1, $2, 'owner', $3, $4, $5, 'owner_login')`,
      [job.id, job.current_step, req.user.id, req.user.stage, workspace]
    );
    await client.query("UPDATE job_steps SET status = 'awaiting_cosign' WHERE job_id = $1 AND step = $2", [job.id, job.current_step]);
    return { job, covered: await actingFor(client, req, workspace) };
  });
  await audit(req, {
    action: 'job.owner_signed', entityType: 'job', entityId: out.job.ref,
    actorUserId: req.user.id, actingForUserId: out.covered,
    details: { step: out.job.current_step, workspace },
  });
  return { ref: out.job.ref, step: out.job.current_step, stepStatus: 'awaiting_cosign' };
}

// Second signature: a DIFFERENT partner proves who they are by typing their own email and password.
export async function coSign(req, ref, { email, password }) {
  const workspace = workspaceOf(req);

  const { rows } = await query(
    'SELECT id, role, partner_stage, is_active, must_change_password, password_hash FROM users WHERE lower(email) = $1',
    [email]
  );
  const u = rows[0];
  const ok = await verifyPassword(password, u ? u.password_hash : DUMMY_HASH);
  if (!u || !ok || !u.is_active || u.role !== 'partner' || u.must_change_password) {
    await audit(req, { action: 'job.cosign_failed', entityType: 'job', entityId: ref, actorUserId: req.user.id, details: { workspace } });
    throw new HttpError(401, 'cosign_credentials_invalid', 'Those partner credentials were not accepted');
  }

  const out = await withTransaction(async (client) => {
    const job = await lockJob(client, ref, workspace);
    if (job.step_status !== 'awaiting_cosign') throw new HttpError(409, 'not_ready', 'This step is not waiting for a co-signature');
    const owner = await client.query(
      "SELECT partner_id FROM job_signatures WHERE job_id = $1 AND step = $2 AND role = 'owner' AND voided_at IS NULL",
      [job.id, job.current_step]
    );
    if (owner.rows[0].partner_id === u.id) {
      throw new HttpError(409, 'same_person', 'The co-signer must be a different partner from the first signer');
    }
    try {
      await client.query(
        `INSERT INTO job_signatures (job_id, step, role, partner_id, signer_stage, workspace_stage, method)
         VALUES ($1, $2, 'cosigner', $3, $4, $5, 'password_reentry')`,
        [job.id, job.current_step, u.id, u.partner_stage, workspace]
      );
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'same_person', 'This partner has already signed this step');
      throw err;
    }
    await client.query("UPDATE job_steps SET status = 'signed_off', signed_off_at = now() WHERE job_id = $1 AND step = $2", [job.id, job.current_step]);

    const idx = STEPS.indexOf(job.current_step);
    let next = 'done';
    if (idx === STEPS.length - 1) {
      await client.query("UPDATE jobs SET status = 'complete', current_step = 'done', completed_at = now() WHERE id = $1", [job.id]);
    } else {
      next = STEPS[idx + 1];
      await client.query("UPDATE job_steps SET status = 'active' WHERE job_id = $1 AND step = $2", [job.id, next]);
      await client.query('UPDATE jobs SET current_step = $2 WHERE id = $1', [job.id, next]);
    }
    return { job, next, ownerId: owner.rows[0].partner_id };
  });

  await audit(req, {
    action: 'job.cosigned', entityType: 'job', entityId: out.job.ref,
    actorUserId: u.id,
    details: { step: out.job.current_step, workspace, firstSigner: out.ownerId, method: 'password_reentry', next: out.next },
  });
  return { ref: out.job.ref, step: out.job.current_step, stepStatus: 'signed_off', jobNow: out.next === 'done' ? 'complete' : out.next };
}

// Any partner can reject the current step with a reason. Sends the job back to this step or an earlier one.
export async function rejectStep(req, ref, { reason, sendBackTo }) {
  const workspace = workspaceOf(req);
  const out = await withTransaction(async (client) => {
    const job = await lockJob(client, ref, workspace);
    const target = sendBackTo || job.current_step;
    const ti = STEPS.indexOf(target);
    const ci = STEPS.indexOf(job.current_step);
    if (ti === -1 || ti > ci) throw new HttpError(400, 'bad_send_back', 'A job can only be sent back to this step or an earlier one');

    // Cancel the signatures on the target step and everything after it.
    await client.query(
      "UPDATE job_signatures SET voided_at = now(), voided_reason = 'Rejected' WHERE job_id = $1 AND voided_at IS NULL AND step = ANY($2)",
      [job.id, STEPS.slice(ti)]
    );
    await client.query(
      "UPDATE job_steps SET status = 'waiting', signed_off_at = NULL WHERE job_id = $1 AND step = ANY($2)",
      [job.id, STEPS.slice(ti + 1)]
    );
    await client.query(
      "UPDATE job_steps SET status = 'active', signed_off_at = NULL WHERE job_id = $1 AND step = $2",
      [job.id, target]
    );
    await client.query('UPDATE jobs SET current_step = $2 WHERE id = $1', [job.id, target]);
    await client.query("UPDATE cosign_requests SET status = 'expired' WHERE job_id = $1 AND status = 'pending'", [job.id]);
    await client.query(
      'INSERT INTO job_rejections (job_id, step, rejected_by, reason, send_back_to) VALUES ($1, $2, $3, $4, $5)',
      [job.id, job.current_step, req.user.id, reason, target]
    );
    return { job, target, covered: await actingFor(client, req, workspace) };
  });
  await audit(req, {
    action: 'job.rejected', entityType: 'job', entityId: out.job.ref,
    actorUserId: req.user.id, actingForUserId: out.covered,
    details: { step: out.job.current_step, sentBackTo: out.target, reason },
  });
  return { ref: out.job.ref, rejectedStep: out.job.current_step, sentBackTo: out.target };
}
