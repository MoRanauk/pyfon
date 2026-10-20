import { createClient, tokenStore } from '@pyfon/api-client';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const STORE = 'trim';
export const tokens = tokenStore('trim');
export const api = createClient({ baseUrl: API_URL, interfaceCode: 'trim', getToken: tokens.get });

export const img = (p) => {
  if (!p) return '';
  if (/^https?:/.test(p)) return p;
  return API_URL + (p.startsWith('/') ? p : '/images/' + p);
};
