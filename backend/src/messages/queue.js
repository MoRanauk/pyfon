// Message queue. Orders add a row here; a separate sender script (OpenWA, later) sends the rows.

// 0712 345 678, +254712345678 and 712345678 all become 254712345678.
export function toWaNumber(raw) {
  let d = String(raw || '').replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '254' + d.slice(1);
  else if (d.length === 9 && (d.startsWith('7') || d.startsWith('1'))) d = '254' + d;
  return d;
}

export async function enqueueMessage(client, { kind, phone, body, orderId = null, quoteRequestId = null }) {
  const to = toWaNumber(phone);
  if (to.length < 10) return null;
  await client.query(
    `INSERT INTO outbound_messages (kind, to_phone, body, order_id, quote_request_id) VALUES ($1, $2, $3, $4, $5)`,
    [kind, to, body, orderId, quoteRequestId]
  );
  return to;
}
