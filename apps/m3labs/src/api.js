import { createClient, tokenStore } from '@pyfon/api-client';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const STAGE = import.meta.env.VITE_STAGE || 'creative';
export const IFACE = 'm3-' + STAGE;
export const P = '/v1/partner';
export const tokens = tokenStore(IFACE);
export const api = createClient({ baseUrl: API_URL, interfaceCode: IFACE, getToken: tokens.get });

export const STAGE_LABEL = { creative: 'Creative', production: 'Production', finance: 'Finance & Delivery' };
export const STEP_LABEL = { finance_quote: 'Finance quote', creative: 'Creative', production: 'Production', finance_delivery: 'Finance delivery', done: 'Done' };
export const STATUS_LABEL = { active: 'Needs first signature', awaiting_cosign: 'Needs second partner', waiting: 'Waiting', signed_off: 'Signed off' };

export const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
export const hoursSince = (d) => (Date.now() - new Date(d).getTime()) / 3600000;
export function age(d) {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  return h < 48 ? h + ' h' : Math.floor(h / 24) + ' days';
}
export function fmt(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v !== 'object') return String(v);
  return Object.entries(v).map(([k, x]) => k + ': ' + (typeof x === 'object' ? JSON.stringify(x) : x)).join(', ');
}
