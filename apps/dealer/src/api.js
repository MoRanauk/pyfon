import { createClient, tokenStore } from '@pyfon/api-client';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const tokens = tokenStore('vendor');
export const api = createClient({ baseUrl: API_URL, interfaceCode: 'vendor', getToken: tokens.get });
