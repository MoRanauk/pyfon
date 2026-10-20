import fs from 'node:fs';
const dir = '../apps/m3labs/src/';
let miss = false;
const test = (t, x) => (x instanceof RegExp ? x.test(t) : t.includes(x));
function edit(file, steps) {
  let t = fs.readFileSync(dir + file, 'utf8');
  let changed = false;
  for (const [label, find, repl, done] of steps) {
    if (test(t, done)) { console.log('Already done: ' + label); continue; }
    if (test(t, find)) {
      t = find instanceof RegExp ? t.replace(find, () => repl) : t.replace(find, () => repl);
      changed = true; console.log('Patched: ' + label);
    } else { console.log('NOT FOUND: ' + label); miss = true; }
  }
  if (changed && !miss) fs.writeFileSync(dir + file, t);
}
const moneyTour = `  '/money': [
    { sel: '.mb .mbar', title: 'Choose the dates', text: 'Pick two dates, or press This month, Last 30 days or This year. Search, show deleted and Download CSV are on the same row.' },
    { sel: '.mb .sum', title: 'Your totals', text: 'Income, direct costs, gross profit, overheads and net profit for those dates.' },
    { txt: 'new entry', title: 'Add an entry', text: 'Press + New entry to record income or an expense.', click: { txt: 'new entry' } },
    { sel: '.mb .form', title: 'Fill the form', text: 'Choose income or expense, the date, category and amount. Add a job reference if it belongs to a job. Direct costs belong to a job; overheads are running costs.', click: { txt: 'close form' }, opt: true },
    { sel: '.mb .grid', title: 'The ledger', text: 'Entries cannot be edited. Press the return arrow to reverse a wrong one, or the cross to ask to delete it, which needs all three partners.', opt: true },
    { txt: 'by category', title: 'Three views', text: 'Ledger lists every entry. By category adds them up by type. By job shows the profit of each job.' },
  ],`;
edit('helpTours.js', [
  ['money tour', /  '\/money': \[[\s\S]*?\r?\n  \],/, moneyTour, 'Choose the dates'],
  ['jobs payment step', "You can also reject with a reason.' },", "You can also reject with a reason.' },\n    { sel: '.inv', title: 'Payment and profit', text: 'On the Finance desk the invoice shows what was paid. Press Record payment as income when the customer pays: it goes to the Money book. The Job money line shows the profit of this job.', opt: true },", 'Payment and profit'],
]);
edit('helpTopics.js', [
  ['money topic', 'Record income and costs. Link a cost to a job to see that job profit.', 'Record income and costs. Customer payments can be added from the invoice on the job page. Link an entry to a job to see that job profit.', 'Customer payments can be added'],
  ['faq', "  { q: 'Something is broken',", "  { q: 'How do I record a customer payment?', a: 'Open the job, find Payment on the invoice and press Record payment as income. It appears in the Money book with the job reference.', k: 'payment paid income money invoice customer' },\n  { q: 'I recorded a wrong money entry', a: 'Entries cannot be edited. Press the return arrow to reverse it, then add the correct one. To delete one, press the cross: all three partners must approve.', k: 'money wrong mistake reverse delete entry edit' },\n  { q: 'Something is broken',", 'How do I record a customer payment?'],
]);
edit('devNav.js', [
  ['remove Help', ", ['/help', 'Help', true]", '', /'Guides', false\],\s*\]/],
]);
process.exit(miss ? 1 : 0);
