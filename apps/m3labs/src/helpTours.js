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
    { sel: '.page', title: 'Money book', text: 'Totals for the dates you choose: income, direct costs, gross profit, overheads and net profit.' },
    { sel: '.page input', title: 'Add an entry', text: 'Choose income or expense, the amount, and a job reference if it belongs to a job.' },
    { sel: '.page table', title: 'The entries', text: 'Entries cannot be edited. Reverse a wrong one, or ask to delete it, which needs all three partners.' },
  ],
  '/reports': [
    { sel: '.page', title: 'Reports', text: 'Sales by day, week or month, top products, jobs per stage and jobs waiting.' },
    { sel: '.page button', title: 'Download', text: 'Any table can be downloaded as a CSV file.' },
  ],
};
