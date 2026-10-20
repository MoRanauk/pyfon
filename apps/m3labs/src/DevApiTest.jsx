import { useState } from 'react';
import { API_URL, IFACE, tokens } from './api.js';

const IFACES = ['dev', 'mco', 'prestige', 'trim', 'm3-creative', 'm3-production', 'm3-finance', 'vendor'];

export default function DevApiTest() {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/v1/dev/ping');
  const [iface, setIface] = useState(IFACE || 'dev');
  const [auth, setAuth] = useState(true);
  const [body, setBody] = useState('');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!path.startsWith('/')) { setOut({ error: 'The path must start with /' }); return; }
    setBusy(true); setOut(null);
    const headers = { 'X-Interface': iface };
    const t = tokens.get();
    if (auth && t) headers.Authorization = 'Bearer ' + t;
    if (body.trim() && method !== 'GET') headers['Content-Type'] = 'application/json';
    const t0 = performance.now();
    try {
      const r = await fetch(API_URL + path, { method, headers, body: body.trim() && method !== 'GET' ? body : undefined });
      const text = await r.text();
      let shown = text;
      try { shown = JSON.stringify(JSON.parse(text), null, 2); } catch (e) { /* plain text */ }
      setOut({ status: r.status, ms: Math.round(performance.now() - t0), text: shown.slice(0, 20000) });
    } catch (e) { setOut({ error: 'Cannot reach the server. Is the backend running?' }); }
    setBusy(false);
  }
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 className="center">API tester</h1>
      <p className="center muted">Sends one request to our own backend with your sign-in. Careful: POST, PUT and DELETE really change data.</p>
      <section className="card">
        <div className="actbar" style={{ justifyContent: 'center' }}>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}</select>
          <select value={iface} onChange={(e) => setIface(e.target.value)}>{IFACES.map((m) => <option key={m}>{m}</option>)}</select>
          <label><input type="checkbox" checked={auth} onChange={(e) => setAuth(e.target.checked)} /> Send my sign-in</label>
        </div>
        <input value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace' }} />
        {method !== 'GET' ? <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="JSON body" spellCheck={false} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', marginTop: '8px' }} /> : null}
        <div className="actbar" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" disabled={busy} onClick={send}>{busy ? 'Sending...' : 'Send'}</button>
        </div>
      </section>
      {out ? (
        <section className="card">
          {out.error ? <p className="err">{out.error}</p> : (
            <>
              <p><b style={{ color: out.status < 400 ? '#0a7a2f' : '#b00020' }}>{out.status}</b> &middot; {out.ms} ms</p>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', margin: 0 }}>{out.text}</pre>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
