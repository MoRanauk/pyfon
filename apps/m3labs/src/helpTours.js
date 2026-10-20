export const HELP_TOURS = {
  '/': [
    { sel: '.side', title: 'Your menu', text: 'Every area of the desk is in this menu. Click a name to open it.' },
    { sel: '.toptabs', title: 'Tabs', text: 'When an area has several pages, they appear here as tabs.' },
    { sel: '.page', title: 'Your summary', text: 'Jobs waiting for you, approvals and recent activity show here. Open a job to act on it.' },
    { sel: '.me', title: 'Your settings', text: 'Click your name to change your photo and password.' },
  ],
  '/orders': [
    { sel: '.page', title: 'Orders flow', text: 'Every order sits in a stage. Find the order you want.' },
    { sel: '.page a', title: 'Open an order', text: 'Click an order to see its job, its invoice and its notes.' },
    { sel: '.side', title: 'Move around', text: 'Use Work in the menu to reach My queue, Approvals and Tickets.' },
  ],
  '/queue': [
    { sel: '.page', title: 'My queue', text: 'These are jobs waiting for this desk.' },
    { sel: '.page a', title: 'Open a job', text: 'Open a job, do the work, then sign off. A second partner must co-sign.' },
  ],
  '/jobs': [
    { sel: '.page', title: 'The job', text: 'Steps, notes and the invoice for one job are on this page.' },
    { sel: '.page button', title: 'Sign off', text: 'Sign off your step. Another partner then co-signs with their own password. You can also reject with a reason.' },
    { sel: '.inv', title: 'Payment and profit', text: 'On the Finance desk the invoice shows what was paid. Press Record payment as income when the customer pays: it goes to the Money book. The Job money line shows the profit of this job.', opt: true },
  ],
  '/products': [
    { sel: '.page input', title: 'Search', text: 'Type a name, code or category to find a product.' },
    { sel: '.page table', title: 'The list', text: 'Click a product name to edit it. A live price change needs approval from all three partners.' },
    { sel: '.toptabs', title: 'Shop tabs', text: 'Product file uploads many products at once. Videos manages shop videos.' },
  ],
  '/csv': [
    { sel: '.page', title: 'Product file', text: 'Upload your products CSV here.' },
    { sel: '.page button', title: 'Dry run first', text: 'A dry run lists every error and changes nothing. Import only when it is clean.' },
  ],
  '/money': [
    { sel: '.mb .mbar', title: 'Choose the dates', text: 'Pick two dates, or press This month, Last 30 days or This year. Search, show deleted and Download CSV are on the same row.' },
    { sel: '.mb .sum', title: 'Your totals', text: 'Income, direct costs, gross profit, overheads and net profit for those dates.' },
    { txt: 'new entry', title: 'Add an entry', text: 'Press + New entry to record income or an expense.', click: { txt: 'new entry' } },
    { sel: '.mb .form', title: 'Fill the form', text: 'Choose income or expense, the date, category and amount. Add a job reference if it belongs to a job. Direct costs belong to a job; overheads are running costs.', click: { txt: 'close form' }, opt: true },
    { sel: '.mb .grid', title: 'The ledger', text: 'Entries cannot be edited. Press the return arrow to reverse a wrong one, or the cross to ask to delete it, which needs all three partners.', opt: true },
    { txt: 'by category', title: 'Three views', text: 'Ledger lists every entry. By category adds them up by type. By job shows the profit of each job.' },
  ],
  '/reports': [
    { sel: '.page', title: 'Reports', text: 'Sales by day, week or month, top products, jobs per stage and jobs waiting.' },
    { sel: '.page button', title: 'Download', text: 'Any table can be downloaded as a CSV file.' },
  ],
};
