// Delivery options shown at checkout. Must match backend/src/delivery.js (the server decides the real fee).
// PLACEHOLDER fees until real ones are decided.
export const DELIVERY = [
  { code: 'pickup', label: 'Pick up from Pyfon Brands', feeKes: 0, needsAddress: false, note: 'Free. We tell you when it is ready.' },
  { code: 'nairobi', label: 'Delivery within Nairobi', feeKes: 300, needsAddress: true, note: 'Paid by you.' },
  { code: 'courier', label: 'Courier outside Nairobi', feeKes: null, needsAddress: true, note: 'Paid by you. We confirm the courier cost on WhatsApp.' },
];
