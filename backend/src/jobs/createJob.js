export const STEPS = ['finance_quote', 'creative', 'production', 'finance_delivery'];

// Creates a job and its four sign-off steps. The first step starts active.
export async function createJob(client, { orderId = null, quoteRequestId = null }) {
  const { rows } = await client.query(
    'INSERT INTO jobs (order_id, quote_request_id) VALUES ($1, $2) RETURNING id, ref',
    [orderId, quoteRequestId]
  );
  const job = rows[0];
  for (let i = 0; i < STEPS.length; i++) {
    await client.query(
      'INSERT INTO job_steps (job_id, step, position, status) VALUES ($1, $2, $3, $4)',
      [job.id, STEPS[i], i + 1, i === 0 ? 'active' : 'waiting']
    );
  }
  return job;
}
