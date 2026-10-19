import { useState } from 'react';
import { P, STAGE_LABEL } from './api.js';
import { get } from './http.js';
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
  const wa = waLink(c.phone, text);
  const acts = (
    <>
      {c.inapp ? <button type="button" className="btnlink" onClick={onInapp}>In-app</button> : null}
      {c.phone ? <a className="btnlink" href={'sms:' + c.phone + '?body=' + encodeURIComponent(text)}>SMS</a> : null}
      {wa ? <a className="btnlink" href={wa} target="_blank" rel="noreferrer">WhatsApp</a> : null}
      {c.email ? <a className="btnlink" href={'mailto:' + c.email + '?body=' + encodeURIComponent(text)}>Email</a> : null}
    </>
  );
  return (
    <div style={{ padding: '6px 0 2px' }}>
      <Composer text={text} setText={setText} actions={acts}
        onSticker={(s) => setText((t) => (t ? t + ' ' : '') + s)}
        onFile={(f) => setText((t) => t + '\n' + f.name + ': ' + f.url)} />
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
