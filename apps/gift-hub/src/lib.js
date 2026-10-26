import { formatKES } from '@pyfon/ui';

export const tagsOf = (i) => (Array.isArray(i && i.tags) ? i.tags : []);
export const tagVals = (i, p) => tagsOf(i).filter((t) => t.startsWith(p + ':')).map((t) => t.slice(p.length + 1));
export const isAddon = (i) => tagsOf(i).includes('addon');
const LABEL = {
  sameday: 'Same-day Nairobi', nairobi: 'Nairobi only', anywhere: 'Ships anywhere',
  valentines: "Valentine's Day", 'mothers-day': "Mother's Day", 'fathers-day': "Father's Day",
};
export const pretty = (s) => LABEL[s] || String(s).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
export const inMenu = (i, m) => (m.by === 'cat' ? i.categorySlug === m.key : tagVals(i, m.prefix).length > 0);
export const priceText = (i) =>
  i.priceType === 'quote' || i.priceKes == null ? 'Request a quote' : (i.priceType === 'from' ? 'From ' : '') + formatKES(i.priceKes);

export function errText(e) {
  if (e && Array.isArray(e.details) && e.details.length) return e.details.map((d) => d.message).filter(Boolean).join('. ') || e.message;
  return (e && e.message) || 'Something went wrong.';
}
export function normPhone(s) {
  const t = String(s || '').replace(/[\s()-]/g, '');
  if (/^0[17]\d{8}$/.test(t)) return '+254' + t.slice(1);
  if (/^\+[1-9]\d{7,14}$/.test(t)) return t;
  return null;
}
// Turns the item's options into [{ name, values: [] }].
export function optionGroups(options) {
  if (!options) return [];
  let out = [];
  if (Array.isArray(options)) {
    out = options.map((o) => {
      if (typeof o === 'string') { const [n, v] = o.split(':'); return { name: (n || '').trim(), values: (v || '').split('|').map((x) => x.trim()) }; }
      return { name: o.name || o.group || o.label || '', values: (o.values || o.options || []).map(String) };
    });
  } else if (typeof options === 'object') {
    out = Object.entries(options).map(([name, v]) => ({ name, values: Array.isArray(v) ? v.map(String) : [] }));
  }
  return out.filter((g) => g.name && g.values.length);
}
