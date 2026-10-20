// Developer desk menu. [path, label, live]. Set live to true when the page is built.
export const DEV_NAV = [
  { name: 'Home', icon: 'home', items: [['/', 'Dashboard', true]] },
  { name: 'Monitor', icon: 'pulse', items: [
    ['/health', 'System health', true], ['/logs', 'Logs and traces', true],
    ['/graphs', 'Traffic graphs', true], ['/errors', 'Error explainer', true], ['/reports', 'Reports', true],
    ['/uptime', 'Uptime and alerts', true],
  ] },
  { name: 'People', icon: 'users', items: [
    ['/users', 'Users', true], ['/tickets', 'Tickets', true], ['/activity', 'Activity log', true],
    ['/sessions', 'Live sessions', true],
  ] },
  { name: 'Security', icon: 'shield', items: [
    ['/sec/scan', 'Security scan', true], ['/sec/access', 'Access matrix test', true],
    ['/sec/pentest', 'Pen-test lab (own system only)', true], ['/sec/secrets', 'Secrets watch', true],
    ['/sec/deps', 'Dependency audit', true], ['/sec/logins', 'Login attacks', true],
  ] },
  { name: 'Code', icon: 'code', items: [
    ['/code', 'Code explorer', true], ['/learn', 'Learn the code', true], ['/ai', 'AI helper', false],
    ['/db', 'Database map', true],
  ] },
  { name: 'Tools', icon: 'tools', items: [
    ['/commands', 'Commands', true], ['/sql', 'SQL console (read only)', true], ['/api-test', 'API tester', true],
    ['/links', 'Links', true], ['/tools', 'Workspace tools', true],
  ] },
  { name: 'System', icon: 'gear', items: [
    ['/settings', 'Settings', true], ['/guide', 'Guides', true],
  ] },
];
