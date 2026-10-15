import { createClient, tokenStore } from '@pyfon/api-client';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const STORE = 'mco';
export const tokens = tokenStore('mco');
export const api = createClient({ baseUrl: API_URL, interfaceCode: 'mco', getToken: tokens.get });

// Turns an image path from the backend into a full address.
// Accepts full links, /images/x.png paths, or a bare file name.
export const img = (p) => {
  if (!p) return '';
  if (/^https?:/.test(p)) return p;
  return API_URL + (p.startsWith('/') ? p : '/images/' + p);
};
