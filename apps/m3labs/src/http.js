import { API_URL, IFACE, tokens } from './api.js';

// Small helper for the new screens. Sends the interface header and the sign-in token,
// accepts JSON or a FormData (file upload) body, and turns server errors into readable messages.
export async function call(method, path, body) {
  const headers = { 'X-Interface': IFACE };
  const t = tokens.get();
  if (t) headers.Authorization = 'Bearer ' + t;
  let payload;
  if (typeof FormData !== 'undefined' && body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let r;
  try { r = await fetch(API_URL + path, { method, headers, body: payload }); }
  catch (e) { throw new Error('Cannot reach the server. Is the backend running?'); }
  let data = null;
  try { data = await r.json(); } catch (e) { data = null; }
  if (!r.ok) throw new Error((data && data.error && data.error.message) || 'Something went wrong (' + r.status + ')');
  return data;
}
export const get = (p) => call('GET', p);
export const post = (p, b) => call('POST', p, b);
export const put = (p, b) => call('PUT', p, b);
export const patch = (p, b) => call('PATCH', p, b);
export function mediaUrl(u) {
  if (!u) return '';
  return /^https?:/.test(u) ? u : API_URL + u;
}
