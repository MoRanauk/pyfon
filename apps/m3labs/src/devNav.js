// Developer desk menu. [path, label, live]. Set live to true when the page is built.
export const DEV_NAV = [
  { name: 'Home', icon: 'home', items: [['/', 'Dashboard', true]] },
  { name: 'Monitor', icon: 'pulse', items: [
    ['/health', 'System health', true], ['/logs', 'Logs and traces', true],
    ['/graphs', 'Traffic graphs', true], ['/errors', 'Error explainer', true], ['/reports', 'Reports', true],
    ['/uptime', 'Uptime and alerts', false],
  ] },
  { name: 'People', icon: 'users', items: [
    ['/users', 'Users', true], ['/tickets', 'Tickets', true], ['/activity', 'Activity log', true],
    ['/sessions', 'Live sessions', false],
  ] },
  { name: 'Security', icon: 'shield', items: [
    ['/sec/scan', 'Security scan', false], ['/sec/access', 'Access matrix test', false],
    ['/sec/pentest', 'Pen-test lab (own system only)', false], ['/sec/secrets', 'Secrets watch', false],
    ['/sec/deps', 'Dependency audit', false], ['/sec/logins', 'Login attacks', false],
  ] },
  { name: 'Code', icon: 'code', items: [
    ['/code', 'Code explorer', false], ['/learn', 'Learn the code', false], ['/ai', 'AI helper', false],
    ['/db', 'Database map', false],
  ] },
  { name: 'Tools', icon: 'tools', items: [
    ['/commands', 'Commands', false], ['/sql', 'SQL console (read only)', false], ['/api-test', 'API tester', false],
    ['/links', 'Links', false], ['/tools', 'Workspace tools', true],
  ] },
  { name: 'System', icon: 'gear', items: [
    ['/settings', 'Settings', true], ['/guide', 'Guides', false],
  ] },
];
