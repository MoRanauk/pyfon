import { useState, useEffect, useRef } from 'react';

const NAVY = '#0b2a4a';
const KEY = 'haruno_chat';
const words = (t) => String(t || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const hello = () => ({ from: 'bot', text: 'Hi, I am Haruno. Ask me anything about this site, or just say hello.', t: now() });
function load() {
  try { const v = JSON.parse(sessionStorage.getItem(KEY)); return Array.isArray(v) && v.length ? v : [hello()]; } catch (e) { return [hello()]; }
}
const CSS = '@keyframes hdot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}';

export default function HarunoChat({ ai, faq = [], topics = {}, face = null, onBack = null }) {
  const [msgs, setMsgs] = useState(load);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch (e) { /* ignore */ }
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs, busy]);

  async function send() {
    const text = q.trim().slice(0, 300);
    if (!text || busy) return;
    const list = msgs.concat({ from: 'me', text, t: now() });
    setMsgs(list);
    setQ('');
    setBusy(true);
    const prev = msgs.slice().reverse().find((m) => m.from === 'me');
    const qw = words(text + ' ' + (prev ? prev.text : ''));
    const pool = faq.concat(Object.values(topics).map((x) => ({ q: x.title, a: x.text, k: x.title })));
    const ranked = pool.map((e) => {
      const ew = words((e.q || '') + ' ' + (e.k || '') + ' ' + (e.a || ''));
      return { e, s: qw.filter((w) => ew.includes(w)).length };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.e);
    const notes = ranked.concat(pool.filter((e) => !ranked.includes(e))).slice(0, 12)
      .map((e) => ({ q: String(e.q || '').slice(0, 300), a: String(e.a || '').slice(0, 800) }));
    const history = list.slice(-7, -1).map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text.slice(0, 600) }));
    let reply = null;
    try { reply = ai ? await ai(text, notes, history) : null; } catch (e) { reply = null; }
    if (!reply) {
      reply = ranked.length
        ? 'I cannot reach my AI brain right now, but this may help: ' + ranked[0].a
        : 'I am not sure about that one. Please message us on WhatsApp and the team will help you.';
    }
    setMsgs((m) => m.concat({ from: 'bot', text: reply, t: now() }));
    setBusy(false);
  }
  function fresh() { setMsgs([hello()]); }

  const bubble = (me) => ({ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '82%', background: me ? '#dcf8c6' : '#fff', color: '#222', padding: '7px 10px 4px', borderRadius: me ? '12px 12px 2px 12px' : '12px 12px 12px 2px', boxShadow: '0 1px 1px rgba(0,0,0,.15)', lineHeight: 1.4, fontSize: '15px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' });
  return (
    <div style={{ marginTop: '0px', border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'min(420px, 64vh)' }}>
      <style>{CSS}</style>
      <div style={{ background: NAVY, color: '#fff', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onBack ? <button type="button" onClick={onBack} aria-label="Back" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>{'\u2190'}</button> : null}<span style={{ background: '#fff', borderRadius: '50%', display: 'inline-flex' }}>{face}</span>
        <div style={{ flex: 1, lineHeight: 1.2 }}><b>Haruno</b><br /><span style={{ fontSize: '12px', opacity: 0.8 }}>{busy ? 'typing...' : 'virtual helper \u00b7 online'}</span></div>
        <button type="button" onClick={fresh} style={{ background: 'none', border: '1px solid #ffffff88', color: '#fff', borderRadius: '10px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}>New chat</button>
      </div>
      <div ref={box} style={{ flex: 1, overflowY: 'auto', background: '#efe9dd', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={bubble(m.from === 'me')}>
            {m.text}
            <div style={{ fontSize: '10px', color: '#888', textAlign: 'right', marginTop: '2px' }}>{m.t}</div>
          </div>
        ))}
        {busy ? (
          <div style={{ ...bubble(false), display: 'flex', gap: '4px', padding: '10px 12px' }}>
            {[0, 1, 2].map((n) => <span key={n} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#888', display: 'inline-block', animation: 'hdot 1.2s infinite', animationDelay: (n * 0.2) + 's' }} />)}
          </div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: '6px', padding: '8px', background: '#f0f0f0', alignItems: 'center' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} placeholder="Type a message" maxLength={300} style={{ flex: 1, minWidth: 0, padding: '9px 12px', border: 'none', borderRadius: '20px', fontSize: '15px' }} />
        <button type="button" onClick={send} disabled={busy} aria-label="Send" style={{ width: '38px', height: '38px', borderRadius: '50%', border: 'none', background: NAVY, color: '#fff', cursor: 'pointer', fontSize: '16px' }}>{'\u27A4'}</button>
      </div>
      <div style={{ fontSize: '10px', color: '#777', padding: '3px 8px 5px', background: '#f0f0f0' }}>Only your typed messages and our help guides go to an AI service. I never see your orders, account or money.</div>
    </div>
  );
}
