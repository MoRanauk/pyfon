import { useEffect, useState } from 'react';
import { themeVars } from '@pyfon/theme';
import { useSiteEdit } from './siteEdit.js';

// Saved words, layout, blocks and theme for this shop. Anyone can read them. Only the developer Site builder can write them.
const API = String(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const KEYS = ['theme', 'words', 'navOrder', 'layout', 'blocks', 'components', 'pages', 'customCss'];
const DEFAULT_CONTENT = { announce: [], theme: {}, words: {}, navOrder: [], layout: {}, blocks: {}, components: {}, pages: {}, customCss: '' };

export function useSiteContent(store) {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  useEffect(() => {
    let live = true;
    fetch(API + '/v1/content/' + store)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!live || !j || !j.data) return;
        setContent((c) => {
          const n = { ...c };
          KEYS.forEach((k) => { if (j.data[k] !== undefined) n[k] = j.data[k]; });
          if (Array.isArray(j.data.announce) && j.data.announce.length) n.announce = j.data.announce;
          return n;
        });
      })
      .catch(() => {});
    return () => { live = false; };
  }, [store]);
  useSiteEdit(content, setContent, DEFAULT_CONTENT);
  return content;
}

export function themeStyle(name, theme) {
  let base = {};
  try { base = themeVars(name) || {}; } catch (e) { base = {}; }
  return { ...base, ...(theme || {}) };
}
