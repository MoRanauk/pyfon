import { useEffect, useState } from 'react';
import { P, STAGE_LABEL } from './api.js';
import { get, post } from './http.js';
import { waLink } from './store.js';
import { useAuth, nameOf } from './Auth.jsx';
import { Chat, Composer } from './ChatParts.jsx';

const GROUPS = [
  ['partners', 'Partners', 'Chat with the other partners'],
  ['developer', 'Developer', 'The technical team'],
  ['dealers', 'Dealers', 'Outside specialists we work with'],
  ['customers', 'Customers', 'Everyone who ordered or asked for a quote'],
];

async function load(kind) {
  if (kind === 'partners') {
    const [t, m] = await Promise.all([get(P + '/team'), get(P + '/messages/people')]);
    const byName = {};
    (m.people || []).forEach((x) => { byName[x.name] = x; });
    const arr = (t.team || []).filter((x) => byName[x.fullName]).map((x) => ({
      id: byName[x.fullName].id, name: x.fullName, phone: x.phone, email: x.email,
      note: STAGE_LABEL[x.stage] || 'Partner', inapp: true, unread: byName[x.fullName].unread,
    }));
    arr.groupUnread = m.groupUnread || 0;
    return arr;
  }
  if (kind === 'customers') {
    const d = await get(P + '/customers');
    return (d.customers || []).map((c) => ({ id: c.phone + c.ref, name: c.name, phone: c.phone, email: c.email, note: 'last: ' + c.ref }));
  }
  const d = await get(P + (kind === 'developer' ? '/connect/developers' : '/connect/dealers'));
  return d.people || [];
}

function Outbox({ c, user, onInapp }) {
  const [text, setText] = useState('Hello ' + c.name + ', this is ' + nameOf(user) + ' from Pyfon Brands.');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState(null);
  const wa = waLink(c.phone, text);
  async function send(channel) {
    setBusy(channel); setNote(null);
    try {
      await post(P + '/connect/send', { channel, to: { name: c.name, phone: c.phone || undefined, email: c.email || undefined }, text, files });
      setNote({ ok: true, text: 'Sent by ' + channel + '.' });
      setFiles([]);
    } catch (e) {
      setNote({ ok: false, channel, text: (e && e.message) || 'Not sent' });
    }
    setBusy('');
  }
  const btn = (channel, label) => (
    <button type="button" className="btnlink" disabled={!!busy} onClick={() => send(channel)}>{busy === channel ? 'Sending...' : label}</button>
  );
  const acts = (
    <>
      {c.inapp ? <button type="button" className="btnlink" onClick={onInapp}>In-app</button> : null}
      {c.phone ? btn('sms', 'SMS') : null}
      {c.phone ? btn('whatsapp', 'WhatsApp') : null}
      {c.email ? btn('email', 'Email') : null}
    </>
  );
  return (
    <div style={{ padding: '6px 0 2px' }}>
      <Composer text={text} setText={setText} actions={acts}
        onSticker={(s) => setText((t) => (t ? t + ' ' : '') + s)}
        onFile={(f) => setFiles((a) => [...a, { name: f.name, url: f.url }])} />
      {files.length ? <p className="muted">Attached: {files.map((f) => f.name).join(', ')}</p> : null}
      {note ? <p style={{ color: note.ok ? '#0a7a2f' : '#b00020' }}>{note.text}</p> : null}
      {note && !note.ok && note.channel === 'whatsapp' && wa ? <p><a className="btnlink" href={wa} target="_blank" rel="noreferrer">Open WhatsApp on my phone instead</a></p> : null}
    </div>
  );
}

function ChannelStatus({ ch }) {
  if (ch === null) return null;
  if (ch === false) return <p className="center muted">Channel status is not available.</p>;
  const state = (on) => <span style={{ color: on ? '#0a7a2f' : '#999' }}>{on ? 'On' : 'Off'}</span>;
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <b>How messages leave the system</b>
      <p className="muted" style={{ margin: '4px 0 8px' }}>Order: WhatsApp, then SMS, then email.</p>
      <div className="mrow"><span className="grow">1. WhatsApp (OpenWA)<br /><span className="muted">{ch.whatsapp.configured ? 'Set up' : 'Not set up'}{' \u00b7 '}mode: {ch.whatsapp.mode}</span></span>{state(ch.whatsapp.sending)}</div>
      <div className="mrow"><span className="grow">2. SMS gateway<br /><span className="muted">{ch.sms.configured ? 'Set up' : 'Not set up yet'}</span></span>{state(ch.sms.configured)}</div>
      <div className="mrow"><span className="grow">3. Email (safety net)<br /><span className="muted">{ch.email.configured ? 'Brevo set up' : 'Brevo not set up'}</span></span>{state(ch.email.fallback)}</div>
    </div>
  );
}

export default function Connect() {
  const { user } = useAuth();
  const [kind, setKind] = useState(null);
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [chat, setChat] = useState(null);
  const [err, setErr] = useState('');
  const [ch, setCh] = useState(null);
  useEffect(() => { get(P + '/connect/channels').then(setCh).catch(() => setCh(false)); }, []);

  function pickGroup(k) {
    setKind(k); setList(null); setQ(''); setOpen(''); setChat(null); setErr('');
    load(k).then(setList).catch((e) => setErr(e.message));
  }
  const wrap = { maxWidth: '640px', margin: '0 auto' };

  if (!kind) {
    return (
      <div style={wrap}>
        <h1 className="center">Connect</h1>
        <p className="center muted">Who do you want to reach?</p>
        <ChannelStatus ch={ch} />
        <div className="card">
          {GROUPS.map(([k, title, sub]) => (
            <div className="mrow" key={k}>
              <span className="grow"><b>{title}</b><br /><span className="muted">{sub}</span></span>
              <button type="button" className="btnlink" onClick={() => pickGroup(k)}>Open</button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const title = GROUPS.find((g) => g[0] === kind)[1];
  if (chat) {
    return (
      <div style={wrap}>
        <h1 className="center">{chat.id === 'all' ? 'All partners' : chat.name}</h1>
        <p className="center"><button type="button" className="btnlink" onClick={() => { setChat(null); pickGroup(kind); }}>&larr; Back to {title}</button></p>
        <Chat target={chat} />
      </div>
    );
  }
  const needle = q.trim().toLowerCase();
  const shown = (list || []).filter((c) => !needle || [c.name, c.phone, c.email, c.note].join(' ').toLowerCase().includes(needle));
  return (
    <div style={wrap}>
      <h1 className="center">{title}</h1>
      <p className="center"><button type="button" className="btnlink" onClick={() => setKind(null)}>&larr; Back to Connect</button></p>
      <div className="card">
        {kind === 'partners' && list ? (
          <div className="mrow" style={{ borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            <span className="grow"><b>Message @all</b>{list.groupUnread ? <span className="badge" style={{ marginLeft: '8px' }}>{list.groupUnread} new</span> : null}<br /><span className="muted">One chat with all partners</span></span>
            <button type="button" className="btnlink" onClick={() => setChat({ id: 'all', name: 'All partners' })}>Open</button>
          </div>
        ) : null}
        {kind === 'customers' || (list && list.length > 6) ? <input placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} /> : null}
        {!list && !err ? <p className="muted">Loading...</p> : null}
        {err ? <p style={{ color: '#b00020' }}>{err}</p> : null}
        {list && !shown.length ? <p className="muted">Nobody found.</p> : null}
        {shown.map((c) => (
          <div key={c.id} style={{ borderBottom: '1px solid #eee', padding: '6px 0' }}>
            <div className="mrow">
              <span className="grow"><b>{c.name}</b>{c.unread ? <span className="badge" style={{ marginLeft: '8px' }}>{c.unread} new</span> : null}<br />
                <span className="muted">{[c.note, c.phone || 'no number saved'].filter(Boolean).join(' \u00b7 ')}</span></span>
              {c.phone ? <a className="btnlink" href={'tel:' + c.phone}>Call</a> : null}
              <button type="button" className="btnlink" onClick={() => setOpen(open === c.id ? '' : c.id)}>Message</button>
            </div>
            {open === c.id ? <Outbox c={c} user={user} onInapp={() => setChat(c)} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
