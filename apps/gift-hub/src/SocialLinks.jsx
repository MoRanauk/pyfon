import { useEffect, useState } from 'react';

// Social icons for the shops. The links come from M3 Labs through /v1/social/<store>.
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const cache = {};
const LABELS = { instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', tiktok: 'TikTok', x: 'X', youtube: 'YouTube', linkedin: 'LinkedIn', telegram: 'Telegram', pinterest: 'Pinterest', snapchat: 'Snapchat', threads: 'Threads' };

// Used only if the server cannot be reached.
export const SOCIAL = [
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/pyfonbrands' },
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/share/1EVH8zMmMB/' },
  { id: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/254794802462' },
];

const SHAPES = {
  instagram: (<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" /></>),
  facebook: (<path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.5V11H7v4h2.5v6h4v-6H16l.5-4h-3V8.8c0-.5.3-.8 1-.8z" fill="currentColor" stroke="none" />),
  whatsapp: (<><path d="M4 20l1.3-4.1A8.5 8.5 0 1 1 8.2 18.8L4 20z" /><path d="M9.2 8.6c0 3.2 2.9 6 6.1 6.1l1.2-1.5-2-1-.9.8c-1-.4-1.9-1.3-2.3-2.3l.8-.9-1-2-1.9.8z" fill="currentColor" stroke="none" /></>),
  tiktok: (<><path d="M14.5 3v10.2a3.7 3.7 0 1 1-3.7-3.7" /><path d="M14.5 3c.3 2.4 1.9 4 4.5 4.3" /></>),
  x: (<path d="M5 4l14 16M19 4L5 20" />),
  youtube: (<><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.3v5.4l4.8-2.7z" fill="currentColor" stroke="none" /></>),
  linkedin: (<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V17M8 7.6v.1M12 17v-4a2.2 2.2 0 0 1 4.4 0v4M12 10.5V17" /></>),
  telegram: (<path d="M21 4L3 11l6 2.2L11 19l3.2-3.8L19 18.5 21 4z" />),
  pinterest: (<><circle cx="12" cy="12" r="9" /><path d="M11 17.5l1.4-6.5M10 12c-.4-2.4 1.1-3.8 3-3.8 1.9 0 3 1.3 2.6 3.2-.4 1.9-1.6 3-3 2.8" /></>),
  snapchat: (<path d="M12 3c-3 0-4.5 2.2-4.5 5v2.5c-.8.3-1.5.3-2.5.3.6.9 1.6 1.2 2.5 1.4-.4 1.3-1.4 2.3-3 2.8 1.3.5 2.3.4 3.2.8.3.6.5 1.2 1.3 1.2 1.2 0 1.7-.8 3-.8s1.8.8 3 .8c.8 0 1-.6 1.3-1.2.9-.4 1.9-.3 3.2-.8-1.6-.5-2.6-1.5-3-2.8.9-.2 1.9-.5 2.5-1.4-1 0-1.7 0-2.5-.3V8c0-2.8-1.5-5-4.5-5z" />),
  threads: (<path d="M16.5 9.5C16 7.5 14.5 6.5 12.3 6.5 9.5 6.5 8 8.7 8 12s1.5 5.5 4.3 5.5c2 0 3.7-1 3.7-2.9 0-2-1.8-2.8-4-2.8-1.3 0-2 .5-2 1.2 0 .7.7 1.2 1.6 1.2 1.8 0 2.7-1.2 2.7-3.6" />),
};

export function SocialIcon({ id, size = 20 }) {
  const g = SHAPES[id];
  if (!g) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{g}</svg>
  );
}

// store = 'mco' | 'prestige' | 'trim'. layout 'row' = icons only, 'list' = icon and name on each line.
export default function SocialLinks({ store, items, size = 20, layout = 'row', gap = 14 }) {
  const [list, setList] = useState(items || (store && cache[store]) || null);
  useEffect(() => {
    if (items || !store || cache[store]) return undefined;
    let live = true;
    fetch(API + '/v1/social/' + store)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad'))))
      .then((j) => {
        const l = (j.links || []).map((x) => ({ id: x.platform, label: LABELS[x.platform] || x.platform, url: x.url }));
        cache[store] = l;
        if (live) setList(l);
      })
      .catch(() => { if (live) setList(SOCIAL); });
    return () => { live = false; };
  }, [store, items]);
  const shown = (list || []).filter((x) => x && SHAPES[x.id] && /^https:\/\//.test(String(x.url || '')));
  if (!shown.length) return null;
  const col = layout === 'list';
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: col ? 'column' : 'row', alignItems: col ? 'flex-start' : 'center', gap }}>
      {shown.map((x) => (
        <li key={x.id}>
          <a href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: 'inherit', textDecoration: 'none' }}>
            <SocialIcon id={x.id} size={size} />
            {col ? <span>{x.label}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
