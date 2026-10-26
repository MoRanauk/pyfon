// Tests OpenWA and TextBee using backend\.env. Sends nothing. Never prints keys.
const ok = (m) => console.log('OK    ' + m);
const bad = (m) => console.log('FAIL  ' + m);
const tb = (process.env.TEXTBEE_BASE_URL || 'https://api.textbee.dev/api/v1').replace(/\/+$/, '');

async function get(url, headers) {
  return fetch(url, { headers, signal: AbortSignal.timeout(10000) });
}

async function openwa() {
  const base = (process.env.OPENWA_URL || '').replace(/\/+$/, '');
  const session = process.env.OPENWA_SESSION || '';
  const key = process.env.OPENWA_KEY || '';
  const header = process.env.OPENWA_KEY_HEADER || 'X-API-Key';
  if (!base || !session || !key) return bad('OpenWA: OPENWA_URL, OPENWA_SESSION or OPENWA_KEY is missing in .env');
  try {
    await get(base, {});
    ok('OpenWA: the server answers');
  } catch (e) { return bad('OpenWA: cannot reach ' + base + ' (' + e.message + ')'); }
  try {
    const r = await get(base + '/api/sessions/' + encodeURIComponent(session), { [header]: key });
    if (r.ok) ok('OpenWA: session found (HTTP ' + r.status + ')');
    else if (r.status === 401 || r.status === 403) bad('OpenWA: the key was rejected (HTTP ' + r.status + ')');
    else if (r.status === 404) bad('OpenWA: session name not found (HTTP 404)');
    else bad('OpenWA: unexpected answer HTTP ' + r.status);
  } catch (e) { bad('OpenWA session check failed: ' + e.message); }
}

async function textbee() {
  const key = process.env.TEXTBEE_API_KEY || '';
  if (!key) return bad('TextBee: TEXTBEE_API_KEY is missing in .env');
  try {
    const r = await get(tb + '/gateway/messages?limit=1', { 'x-api-key': key });
    if (r.ok) ok('TextBee: key accepted (HTTP ' + r.status + ')');
    else if (r.status === 401 || r.status === 403) bad('TextBee: the key was rejected (HTTP ' + r.status + ')');
    else bad('TextBee: unexpected answer HTTP ' + r.status);
  } catch (e) { bad('TextBee: cannot reach ' + tb + ' (' + e.message + ')'); }
}

await openwa();
await textbee();
console.log('Done');
