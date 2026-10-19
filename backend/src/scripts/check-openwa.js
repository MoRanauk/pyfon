const base = (process.env.OPENWA_URL || '').replace(/\/+$/, '');
const session = process.env.OPENWA_SESSION || '';
const header = process.env.OPENWA_KEY_HEADER || 'X-API-Key';
const key = process.env.OPENWA_KEY || '';
if (!base || !session || !key) { console.log('Missing OPENWA_URL, OPENWA_SESSION or OPENWA_KEY in .env'); process.exit(1); }
for (const p of ['/api/sessions/' + encodeURIComponent(session), '/api/sessions']) {
  try {
    const r = await fetch(base + p, { headers: { [header]: key }, signal: AbortSignal.timeout(15000) });
    console.log('GET ' + p.replace(session, '<session>') + ' -> HTTP ' + r.status);
    console.log((await r.text()).slice(0, 500));
  } catch (e) { console.log('GET ' + p + ' failed: ' + e.message); }
}
process.exit(0);
