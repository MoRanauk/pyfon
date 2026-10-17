// Builds the tracking line a customer sees for an order. It only READS the job's step statuses.
export function buildStages({ createdAt, deliveryMethod, jobStatus, steps, readyAt, completedAt }) {
  const pickup = deliveryMethod === 'pickup';
  const status = (n) => (steps && steps[n] && steps[n].status) || 'waiting';
  const signedAt = (n) => (steps && steps[n] && steps[n].signedOffAt) || null;
  const list = [
    { key: 'made', label: 'Order Made', note: 'We have your order.', reached: true, at: createdAt },
    { key: 'pending', label: 'Order Pending', note: 'We are confirming your price and payment.', reached: true, at: null },
    { key: 'received', label: 'Order Received', note: 'Confirmed. We are checking your design.', reached: status('finance_quote') === 'signed_off', at: signedAt('finance_quote') },
    { key: 'working', label: 'Order Being Worked On', note: 'We are making your order.', reached: status('creative') === 'signed_off', at: signedAt('creative') },
    { key: 'done', label: 'Order Done', note: 'Your order is finished and being prepared.', reached: status('production') === 'signed_off', at: signedAt('production') },
    {
      key: 'ready',
      label: pickup ? 'Ready for Pick Up' : 'Ready for Delivery',
      note: pickup ? 'Come and collect it from Pyfon Brands.' : 'It is on its way to you.',
      reached: ['awaiting_cosign', 'signed_off'].includes(status('finance_delivery')),
      at: readyAt || null,
    },
    { key: 'delivered', label: pickup ? 'Collected' : 'Delivered', note: 'Thank you for choosing Pyfon Brands.', reached: jobStatus === 'complete', at: completedAt || null },
  ];
  let last = 0;
  while (last + 1 < list.length && list[last + 1].reached) last++;
  const stages = list.map((s, i) => ({
    key: s.key, label: s.label, note: s.note, at: s.at,
    state: i < last ? 'done' : i === last ? (last === list.length - 1 ? 'done' : 'current') : 'todo',
  }));
  return { stages, currentKey: list[last].key, currentLabel: list[last].label, currentNote: list[last].note };
}
