// Delivery options. Must match backend/src/delivery.js (the server decides the real fee).
export const DELIVERY = [
  { code: 'pickup', label: 'Pick up from TriM Atelier Shop', feeKes: 0, needsAddress: false, note: 'Free. We tell you when it is ready.' },
  { code: 'nairobi', label: 'Delivery within Nairobi', feeKes: 300, needsAddress: true, note: 'Paid by you.' },
  { code: 'courier', label: 'Courier outside Nairobi', feeKes: null, needsAddress: true, note: 'We confirm the courier cost on WhatsApp.' },
];
