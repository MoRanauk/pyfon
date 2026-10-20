import { API_URL } from './api.js';

const SITE = 'Prestige M';

// Sends only the typed question and public help notes. Returns null on any problem.
export async function askAi(question, notes, history) {
  try {
    const r = await fetch(API_URL + '/v1/help/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Interface': 'prestige' },
      body: JSON.stringify({ question, notes, history: history || [], site: SITE }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.answer || null;
  } catch (e) {
    return null;
  }
}
