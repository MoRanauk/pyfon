import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokens, STORE } from './api.js';
import { tagVals } from './lib.js';

const A = createContext(null);
const C = createContext(null);
const K = createContext({ items: [], ready: false });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!tokens.get()) { setReady(true); return; }
    api.auth.me().then((d) => setUser(d.user || d)).catch(() => tokens.clear()).finally(() => setReady(true));
  }, []);
  async function login(email, password) {
    const d = await api.auth.login(email, password);
    tokens.set(d.token); setUser(d.user); return d;
  }
  async function register(email, password, name, phone) {
    await api.auth.register(email, password, name, phone);
    return login(email, password);
  }
  function logout() { tokens.clear(); setUser(null); }
  return <A.Provider value={{ user, ready, login, register, logout }}>{children}</A.Provider>;
}
export const useAuth = () => useContext(A);

const KEY = 'pyfon_cart_trim';
const load = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* ignore */ } }, [lines]);
  const add = (item, qty, text, options) => setLines((prev) => {
    const opts = options || {};
    const key = item.sku + '|' + (text || '') + '|' + JSON.stringify(opts);
    if (prev.find((l) => l.key === key)) return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, 1000) } : l));
    return [...prev, {
      key, sku: item.sku, name: item.name, priceKes: item.priceKes, image: item.image, qty, text: text || '', options: opts,
      minOrderQty: item.minOrderQty || 1, fresh: tagVals(item, 'delivery').includes('nairobi'),
    }];
  });
  const setQty = (key, q) => setLines((p) => p.map((l) => (l.key === key ? { ...l, qty: Math.max(l.minOrderQty || 1, Math.min(1000, q || 1)) } : l)));
  const remove = (key) => setLines((p) => p.filter((l) => l.key !== key));
  const clear = () => setLines([]);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.priceKes, 0);
  return <C.Provider value={{ lines, add, setQty, remove, clear, count, total }}>{children}</C.Provider>;
}
export const useCart = () => useContext(C);

async function loadAll() {
  let all = []; let page = 1; let total = 0;
  do {
    const d = await api.catalog.items(STORE, { limit: 60, page });
    all = all.concat(d.items); total = d.total; page += 1;
  } while (all.length < total && page <= 6);
  return all;
}
export function CatalogProvider({ children }) {
  const [s, setS] = useState({ items: [], ready: false, error: '' });
  useEffect(() => {
    let live = true;
    loadAll().then((items) => live && setS({ items, ready: true, error: '' }))
      .catch((e) => live && setS({ items: [], ready: true, error: e.message }));
    return () => { live = false; };
  }, []);
  return <K.Provider value={s}>{children}</K.Provider>;
}
export const useCatalog = () => useContext(K);
