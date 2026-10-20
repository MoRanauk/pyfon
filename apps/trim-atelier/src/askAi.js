import * as A from './api.js';

const SITE = 'TriM Atelier';
const BASE = A.API_URL || (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000';

// Sends only the typed question and public help notes. Returns null on any problem.
export async function askAi(question, notes, history) {
  try {
    const r = await fetch(BASE + '/v1/help/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Interface': 'trim' },
      body: JSON.stringify({ question, notes, history: history || [], site: SITE }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.answer || null;
  } catch (e) {
    return null;
  }
}
