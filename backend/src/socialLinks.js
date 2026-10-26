import { toWaNumber } from './messages/queue.js';

export const STORES = ['mco', 'prestige', 'trim'];
export const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' }, { id: 'facebook', label: 'Facebook' }, { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'tiktok', label: 'TikTok' }, { id: 'x', label: 'X' }, { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' }, { id: 'telegram', label: 'Telegram' }, { id: 'pinterest', label: 'Pinterest' },
  { id: 'snapchat', label: 'Snapchat' }, { id: 'threads', label: 'Threads' },
];

// Turns whatever was pasted into a safe https link, or null when it cannot be used.
export function cleanSocialUrl(raw, platform) {
  let t = String(raw || '').trim();
  if (!t) return null;
  if (platform === 'whatsapp' && /^[+\d\s()-]{9,18}$/.test(t)) {
    const n = toWaNumber(t);
    return n.length >= 10 ? 'https://wa.me/' + n : null;
  }
  if (/^http:\/\//i.test(t)) t = 'https://' + t.slice(7);
  if (!/^https:\/\//i.test(t)) t = 'https://' + t;
  let u;
  try { u = new URL(t); } catch (e) { return null; }
  if (u.protocol !== 'https:' || !u.hostname.includes('.')) return null;
  if (/(^|\.)instagram\.com$/.test(u.hostname)) { u.search = ''; u.hash = ''; }
  const out = u.toString();
  return out.length <= 300 ? out : null;
}
