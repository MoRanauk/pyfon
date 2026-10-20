import fs from 'node:fs';
const file = '../apps/m3labs/src/Invoice.jsx';
let t = fs.readFileSync(file, 'utf8');
let miss = false, changed = false;
const steps = [
  ['import', "import { get, post, patch } from './http.js';", "import { get, post, patch } from './http.js';\nimport { call, today } from './moneyApi.js';", "from './moneyApi.js'"],
  ['state', "const base = '/v1/partner';", "const base = '/v1/partner';\n  const [pay, setPay] = useState({ income: 0, cost: 0, amount: '' });", 'const [pay, setPay]'],
  ['load', 'setD(x);', `setD(x);
      try {
        const m = await call('GET', '/money/by-job?from=2000-01-01&to=' + today());
        const row = m.jobs.find((j) => j.jobRef === ref);
        setPay({ income: row ? Number(row.income) : 0, cost: row ? Number(row.cost) : 0, amount: '' });
      } catch (e2) { setPay({ income: 0, cost: 0, amount: '' }); }`, '/money/by-job'],
  ['profit line', '{err ? <p className="err">{err}</p> : null}', `{err ? <p className="err">{err}</p> : null}
      {pay.income || pay.cost ? <p className="muted"><b>Job money:</b> income {kes(pay.income)} &middot; costs {kes(pay.cost)} &middot; profit <b>{kes(pay.income - pay.cost)}</b></p> : null}`, 'Job money:'],
  ['payment', '<p className="muted">{inv.emailedAt', `<h3>Payment</h3>
          <p className="muted">Paid so far {kes(pay.income)} of {kes(inv.totalKes)}{pay.income >= inv.totalKes ? ' (paid in full)' : ''}</p>
          {pay.income < inv.totalKes ? (
            <div>
              <input type="number" min="1" placeholder={'Amount received (empty = balance due ' + (inv.totalKes - pay.income) + ')'} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <button type="button" onClick={() => run(async () => {
                const due = inv.totalKes - pay.income;
                const a = pay.amount ? Number(pay.amount) : due;
                if (!(a > 0) || !Number.isInteger(a)) throw new Error('Enter a whole amount above zero');
                if (a > due) throw new Error('That is more than the balance due');
                await call('POST', '/money/entries', { date: today(), kind: 'income', category: 'Sales', amountKes: a, jobRef: inv.jobRef, party: inv.billName, note: 'Payment for invoice ' + inv.number });
              }, 'Payment recorded in the Money book')}>Record payment as income</button>
            </div>
          ) : null}
          <p className="muted">{inv.emailedAt`, 'Record payment as income'],
];
for (const [label, find, repl, done] of steps) {
  if (t.includes(done)) { console.log('Already done: ' + label); continue; }
  if (t.includes(find)) { t = t.split(find).join(repl); changed = true; console.log('Patched: ' + label); }
  else { console.log('NOT FOUND: ' + label); miss = true; }
}
if (changed && !miss) fs.writeFileSync(file, t);
process.exit(miss ? 1 : 0);
