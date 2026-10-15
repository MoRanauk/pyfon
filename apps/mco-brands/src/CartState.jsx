import { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'pyfon_cart_mco';
const Ctx = createContext(null);

function load() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* ignore */ }
  }, [lines]);

  const add = (item, qty, text) =>
    setLines((prev) => {
      const key = item.sku + '|' + (text || '');
      const found = prev.find((l) => l.key === key);
      if (found) return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + qty, 100000) } : l));
      return [...prev, { key, sku: item.sku, name: item.name, priceKes: item.priceKes, image: item.image, minOrderQty: item.minOrderQty || 1, qty, text: text || '' }];
    });
  const setQty = (key, qty) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(l.minOrderQty || 1, Math.min(100000, qty || 1)) } : l)));
  const remove = (key) => setLines((prev) => prev.filter((l) => l.key !== key));
  const clear = () => setLines([]);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.priceKes, 0);

  return <Ctx.Provider value={{ lines, add, setQty, remove, clear, count, total }}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
