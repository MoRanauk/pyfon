import { createClient, tokenStore } from '@pyfon/api-client';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const STORE = 'mco';
export const tokens = tokenStore('mco');
export const api = createClient({ baseUrl: API_URL, interfaceCode: 'mco', getToken: tokens.get });

// The backend returns image paths like /images/file.png. Add the API address.
export const img = (p) => (p ? API_URL + p : '');
