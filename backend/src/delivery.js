// Delivery options. The customer pays delivery. feeKes null = we confirm the cost on WhatsApp.
// PLACEHOLDER fees: change them here, and in apps/mco-brands/src/delivery.js, until real fees are decided.
export const DELIVERY = [
  { code: 'pickup', label: 'Pick up from Pyfon Brands', feeKes: 0, needsAddress: false, note: 'Free. We tell you when it is ready.' },
  { code: 'nairobi', label: 'Delivery within Nairobi', feeKes: 300, needsAddress: true, note: 'Paid by you.' },
  { code: 'courier', label: 'Courier outside Nairobi', feeKes: null, needsAddress: true, note: 'Paid by you. We confirm the courier cost on WhatsApp.' },
];

export const findDelivery = (code) => DELIVERY.find((d) => d.code === code) || null;
