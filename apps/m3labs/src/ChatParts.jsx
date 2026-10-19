import { useEffect, useRef, useState } from 'react';
import { P } from './api.js';
import { get, post } from './http.js';

const cp = (n) => String.fromCodePoint(n);
const EMOJI = [0x1F600, 0x1F602, 0x1F60A, 0x1F60D, 0x1F61C, 0x1F914, 0x1F62E, 0x1F622, 0x1F621, 0x1F44D, 0x1F44E, 0x1F44F, 0x1F64F, 0x1F4AA, 0x1F525, 0x2764, 0x1F389, 0x2705, 0x274C, 0x26A0, 0x2753, 0x1F440, 0x1F4CE, 0x1F4F7, 0x1F3A8, 0x1F4E6, 0x1F69A, 0x1F4B0, 0x23F3, 0x1F680, 0x1F31F, 0x1F91D].map(cp);
const STICKERS = [[0x2705, 'Approved'], [0x1F6E0, 'Fixing now'], [0x1F440, 'Looking at it'], [0x23F3, 'One minute'], [0x1F389, 'All done'], [0x2753, 'Need more info'], [0x1F3A8, 'New design'], [0x1F680, 'On its way']].map(([c, l]) => cp(c) + ' ' + l);

export async function uploadToCloud(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('That file is over 10 MB.');
  const s = await get(P + '/messages/upload-sign');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', s.apiKey);
  fd.append('timestamp', s.timestamp);
  fd.append('folder', s.folder);
  fd.append('signature', s.signature);
  let r;
  try { r = await fetch('https://api.cloudinary.com/v1_1/' + s.cloudName + '/auto/upload', { method: 'POST', body: fd }); }
  catch (e) { throw new Error('Could not reach file storage.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.secure_url) throw new Error((d.error && d.error.message) || 'Upload failed');
  return { url: d.secure_url, name: file.name, type: file.type || '' };
}

export function Composer({ text, setText, onSend, onSticker, onFile, busy, actions }) {
  const [panel, setPanel] = useState('');
  const [up, setUp] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  async function pick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setUp(true); setErr('');
    try { await onFile(await uploadToCloud(f)); } catch (x) { setErr(x.message); }
    setUp(false);
  }
  const add = (s) => setText((t) => t + s);
  return (
    <div>
      {panel === 'emoji' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px 0' }}>
          {EMOJI.map((e) => <button type="button" key={e} onClick={() => add(e)} style={{ fontSize: '22px', background: 'none', border: 0, cursor: 'pointer' }}>{e}</button>)}
        </div>
      ) : null}
      {panel === 'stickers' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px 0' }}>
          {STICKERS.map((s) => <button type="button" className="btnlink" key={s} onClick={() => { onSticker(s); setPanel(''); }}>{s}</button>)}
        </div>
      ) : null}
      <textarea rows="3" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" style={{ width: '100%', boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', alignItems: 'center' }}>
        <button type="button" className="btnlink" onClick={() => setPanel(panel === 'emoji' ? '' : 'emoji')}>{cp(0x1F600)} Emoji</button>
        <button type="button" className="btnlink" onClick={() => setPanel(panel === 'stickers' ? '' : 'stickers')}>{cp(0x1F31F)} Stickers</button>
        <button type="button" className="btnlink" disabled={up} onClick={() => fileRef.current && fileRef.current.click()}>{up ? 'Uploading...' : cp(0x1F4CE) + ' Attach'}</button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" onChange={pick} style={{ display: 'none' }} />
        <span className="grow" />
        {actions || <button type="button" className="btnlink" disabled={busy || !text.trim()} onClick={onSend}>{busy ? 'Sending...' : 'Send'}</button>}
      </div>
      {err ? <p style={{ color: '#b00020', margin: '6px 0 0' }}>{err}</p> : null}
    </div>
  );
}

function Bubble({ m, group }) {
  const mine = m.mine;
  const when = new Date(m.at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const isImg = m.file && /^image\//.test(m.file.type || '');
  const i = m.body.indexOf(' ');
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', margin: '6px 0' }}>
      <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '12px', background: mine ? '#0b2a4a' : '#ece8da', color: mine ? '#fff' : '#0b2a4a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {group && !mine ? <div style={{ fontSize: '12px', fontWeight: 700 }}>{m.from}</div> : null}
        {m.kind === 'sticker' ? <div style={{ textAlign: 'center' }}><div style={{ fontSize: '40px' }}>{m.body.slice(0, i)}</div>{m.body.slice(i + 1)}</div> : null}
        {m.kind === 'file' && m.file ? (isImg
          ? <a href={m.file.url} target="_blank" rel="noreferrer"><img src={m.file.url} alt={m.file.name} style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', display: 'block' }} /></a>
          : <a href={m.file.url} target="_blank" rel="noreferrer" style={{ color: mine ? '#f3d27a' : '#0b2a4a', fontWeight: 700 }}>{cp(0x1F4C4)} {m.file.name}</a>) : null}
        {m.kind === 'text' ? m.body : null}
        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>{when}</div>
      </div>
    </div>
  );
}

export function Chat({ target }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef(null);
  const group = target.id === 'all';
  const path = group ? '/messages/group' : '/messages/with/' + target.id;
  const load = () => get(P + path).then((d) => setMsgs(d.messages)).catch((e) => setErr(e.message));
  useEffect(() => { setMsgs([]); load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, [target.id]);
  useEffect(() => { if (end.current) end.current.scrollIntoView({ block: 'nearest' }); }, [msgs.length]);
  async function send(kind, body, file) {
    setBusy(true); setErr('');
    try { await post(P + '/messages', { to: target.id, kind, body, file }); if (kind === 'text') setText(''); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div className="card">
      <b>{group ? 'All partners' : 'Chat with ' + target.name}</b>
      <div style={{ maxHeight: '360px', overflowY: 'auto', margin: '10px 0' }}>
        {msgs.length === 0 ? <p className="muted">No messages yet.</p> : null}
        {msgs.map((m) => <Bubble key={m.id} m={m} group={group} />)}
        <div ref={end} />
      </div>
      <Composer text={text} setText={setText} busy={busy}
        onSend={() => text.trim() && send('text', text.trim())}
        onSticker={(s) => send('sticker', s)}
        onFile={(f) => send('file', '', f)} />
      {err ? <p style={{ color: '#b00020' }}>{err}</p> : null}
    </div>
  );
}
