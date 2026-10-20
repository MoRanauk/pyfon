// Partner desk menu. [path, label, live]. Same shape as devNav.js.
import { STAGE } from './api.js';

export const PARTNER_MENU = [
  { name: 'Home', icon: 'home', items: [['/', 'Dashboard', true]] },
  { name: 'Work', icon: 'grid', items: [
    ['/orders', 'Orders flow', true], ['/queue', 'My queue', true],
    ['/approvals', 'Approvals', true], ['/tickets', 'Tickets', true],
  ] },
  { name: 'Shop', icon: 'box', items: [
    ['/products', 'Products', true], ['/csv', 'Product file', true], ['/videos', 'Videos', true],
  ] },
  { name: 'Insights', icon: 'pulse', items: [
    ['/reports', 'Reports', true], ['/activity', 'Activity log', true],
  ] },
  { name: 'Money', icon: 'list', items: [['/money', 'Money book', STAGE === 'finance']] },
  { name: 'Connect', icon: 'chat', items: [['/connect', 'Connect', true]] },
  { name: 'Tools', icon: 'tools', items: [['/tools', 'Workspace tools', true]] },
];
