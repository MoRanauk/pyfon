import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, P, STEP_LABEL, STATUS_LABEL } from './api.js';

const ORDER = ['finance_quote', 'creative', 'production', 'finance_delivery'];

export default function JobSteps() {
  const { ref } = useParams();
  const [d, setD] = useState(null);
  useEffect(() => {
    let live = true;
    const load = () => api.get(P + '/jobs/' + ref).then((x) => { if (live) setD(x); }).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => { live = false; clearInterval(t); };
  }, [ref]);
  if (!d) return null;
  const { job, steps, signatures } = d;
  const complete = job.status === 'complete';
  const who = (s) => signatures.filter((g) => g.step === s).map((g) => g.partnerName);
  const cur = steps.find((s) => s.step === job.currentStep);
  const st = cur ? cur.status : '';
  let next = '';
  if (complete) next = 'All four steps are signed. This job is complete.';
  else if (st === 'awaiting_cosign') next = 'Signed by ' + who(job.currentStep).join(', ') + '. A different partner must co-sign now.';
  else if (st === 'active') next = STEP_LABEL[job.currentStep] + ' is being worked on. One partner signs, then a second partner co-signs.';
  return (
    <section className="card jsteps">
      <ol>
        {ORDER.map((s, i) => {
          const x = steps.find((y) => y.step === s);
          const status = x ? x.status : '';
          const done = complete || status === 'signed_off';
          const now = !complete && s === job.currentStep;
          const names = who(s);
          return (
            <li key={s} className={(done ? 'done ' : '') + (now ? 'now' : '')}>
              <span className="dot">{done ? '\u2713' : i + 1}</span>
              <b>{STEP_LABEL[s]}</b>
              <small>{STATUS_LABEL[status] || status}</small>
              {names.length ? <small>{names.join(' + ')}</small> : null}
            </li>
          );
        })}
      </ol>
      {next ? <p className="jnext">{next}</p> : null}
    </section>
  );
}
