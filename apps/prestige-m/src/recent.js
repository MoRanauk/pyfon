const KEY = 'pyfon_recent';

// Returns the list of viewed SKUs, newest first.
export function getRecent() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

// Adds a SKU to the front of the list (keeps the last 24).
export function pushRecent(sku) {
  try {
    const a = getRecent().filter((x) => x !== sku);
    a.unshift(sku);
    localStorage.setItem(KEY, JSON.stringify(a.slice(0, 24)));
  } catch { /* ignore */ }
}

export function clearRecent() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
