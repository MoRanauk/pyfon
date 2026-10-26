import { useEffect, useState } from 'react';

// Pictures for the shop's coloured spaces, set in M3 Labs > Shop photos. Empty until a picture is chosen.
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const cache = {};

export function useSiteImages(store) {
  const [map, setMap] = useState(cache[store] || {});
  useEffect(() => {
    if (cache[store]) return undefined;
    let live = true;
    fetch(API + '/v1/media/site/' + store)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad'))))
      .then((j) => {
        const m = {};
        for (const [k, v] of Object.entries(j.images || {})) { if (/^https:\/\//.test(String(v))) m[k] = v; }
        cache[store] = m;
        if (live) setMap(m);
      })
      .catch(() => {});
    return () => { live = false; };
  }, [store]);
  return map;
}
