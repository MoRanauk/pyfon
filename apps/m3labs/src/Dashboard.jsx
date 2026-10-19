import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, nameOf } from './Auth.jsx';
import { P, STAGE, STAGE_LABEL, STEP_LABEL, kes, age, hoursSince } from './api.js';
import { get } from './http.js';
import { ls, ukey } from './store.js';

const MINE = { creative: ['creative'], production: ['production'], finance: ['finance_quote', 'finance_delivery'] };
const STEPS = ['finance_quote', 'creative', 'production', 'finance_delivery'];
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [asks, setAsks] = useState(0);
  const [err, setErr] = useState('');
  const dev = STAGE === 'dev';

  useEffect(() => {
    if (dev) return undefined;
    let live = true;
    async function load() {
      try {
        const [i, r] = await Promise.all([get(P + '/inflow'), get(P + '/cosign-requests')]);
        if (!live) return;
        setD(i); setAsks((r.requests || []).length); setErr('');
      } catch (e) { if (live) setErr(e.message); }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { live = false; clearInterval(t); };
  }, [dev]);

  const today = new Date().toLocaleDateString('en-CA');
  const events = ls.get(ukey(user, 'events'), []).filter((e) => e.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const todos = ls.get(ukey(user, 'todo'), []).filter((t) => !t.done);

  const today_card = (
    <section className="card">
      <h2>Today</h2>
      {events.length ? events.map((e) => <div className="mrow" key={e.id}><b>{e.time || 'All day'}</b><span className="grow">{e.title}</span></div>) : <p className="muted">Nothing scheduled today.</p>}
      <p className="muted">{todos.length} open to-do{todos.length === 1 ? '' : 's'}. <Link to="/tools">Open workspace tools</Link></p>
    </section>
  );

  if (dev) {
    return (
      <div>
        <h1 className="center">{hello()}, {nameOf(user)}</h1>
        <section className="card">
          <h2>Developer desk</h2>
          <p className="muted">System health, the error log, request traffic and reports arrive with Phase 8. For now you can manage the home page videos and use the workspace tools. This desk cannot sign off jobs or change prices.</p>
        </section>
        {today_card}
      </div>
    );
  }
  if (!d) return <p className="center">{err || 'Loading...'}</p>;

  const jobs = d.jobs;
  const counts = STEPS.map((s) => jobs.filter((j) => j.currentStep === s).length);
  const second = jobs.filter((j) => j.stepStatus === 'awaiting_cosign').length;
  const late = jobs.filter((j) => hoursSince(j.createdAt) > 24).length;
  const max = Math.max(1, ...d.days.map((x) => x.n));
  const mine = MINE[user.stage] || MINE[STAGE] || [];

  return (
    <div>
      <h1 className="center">{hello()}, {nameOf(user)}</h1>
      <p className="center muted">{STAGE_LABEL[STAGE]} desk</p>
      {err ? <p className="err center">{err}</p> : null}
      {asks ? <p className="center"><Link className="btnlink" to="/queue">{asks} sign-off request{asks === 1 ? '' : 's'} waiting for you</Link></p> : null}

      <div className="kpis">
        <div className="kpi"><span>New in 24 hours</span><b>{d.stats.new24}</b></div>
        <div className="kpi"><span>Open jobs</span><b>{d.stats.open}</b></div>
        <div className="kpi"><span>Need a second partner</span><b>{second}</b></div>
        <div className={'kpi' + (late ? ' alert' : '')}><span>Waiting over 24 h</span><b>{late}</b></div>
      </div>

      <section className="card">
        <h2>Where the work is</h2>
        <div className="pipe">
          {STEPS.map((s, i) => (
            <Link to="/orders" className={'pstep' + (mine.includes(s) ? ' mine' : '')} key={s} style={{ textDecoration: 'none', color: 'inherit' }}>
              <b style={{ fontSize: '24px', color: '#0b2a4a' }}>{counts[i]}</b><br /><span className="muted">{STEP_LABEL[s]}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="tools">
        <section className="card">
          <h2>Orders in the last 7 days</h2>
          <div className="bars">
            {d.days.map((x) => (
              <div className="bar" key={x.day}><span>{x.n}</span><i style={{ height: Math.round((x.n / max) * 80) + '%' }} /><span>{x.day.slice(5)}</span></div>
            ))}
          </div>
        </section>
        {today_card}
      </div>

      <section className="card">
        <h2>Latest orders</h2>
        {!jobs.length ? <p className="muted">No open orders right now.</p> : null}
        {jobs.slice(0, 8).map((j) => (
          <Link className="mrow" key={j.ref} to={'/jobs/' + j.ref} style={{ textDecoration: 'none', color: 'inherit' }}>
            <b>{j.ref}</b>
            <span className="grow">{j.customer || 'Customer'} &middot; {j.orderRef ? kes(j.totalKes) : 'Quote'}</span>
            <span className="muted">{STEP_LABEL[j.currentStep]} &middot; {age(j.createdAt)}</span>
          </Link>
        ))}
        <p><Link to="/orders">See the whole flow</Link></p>
      </section>
    </div>
  );
}
