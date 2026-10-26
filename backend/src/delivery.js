// Delivery options. The customer pays delivery. feeKes null = we confirm the cost on WhatsApp.
// PLACEHOLDER fees: change them here, and in apps/mco-brands/src/delivery.js, until real fees are decided.
export const DELIVERY = [
  { code: 'pickup', label: 'Pick up from Pyfon Brands', feeKes: 0, needsAddress: false, note: 'Free. We tell you when it is ready.' },
  { code: 'nairobi', label: 'Delivery within Nairobi', feeKes: 300, needsAddress: true, note: 'Paid by you.' },
  { code: 'courier', label: 'Courier outside Nairobi', feeKes: null, needsAddress: true, note: 'Paid by you. We confirm the courier cost on WhatsApp.' },
];

export const findDelivery = (code) => DELIVERY.find((d) => d.code === code) || null;

export const SHOP_NAMES = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };

// Same as findDelivery, but the pickup label names the shop the customer ordered from.
export function deliveryFor(code, storefront) {
  const d = findDelivery(code);
  if (!d) return null;
  if (d.code === 'pickup' && SHOP_NAMES[storefront]) return { ...d, label: 'Pick up from ' + SHOP_NAMES[storefront] + ' Shop' };
  return d;
}
