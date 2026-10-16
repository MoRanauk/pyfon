-- 008_delivery_queue.sql: delivery on orders, and a queue of WhatsApp messages to send
ALTER TABLE orders ADD COLUMN delivery_method text NOT NULL DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN delivery_fee_kes integer CHECK (delivery_fee_kes IS NULL OR delivery_fee_kes >= 0);
ALTER TABLE orders ADD COLUMN delivery_address text;
UPDATE orders SET delivery_fee_kes = 0;

CREATE TABLE outbound_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('order_received','quote_received','custom')),
  to_phone text NOT NULL,
  body text NOT NULL,
  order_id bigint REFERENCES orders(id) ON DELETE SET NULL,
  quote_request_id bigint REFERENCES quote_requests(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX outbound_messages_status_idx ON outbound_messages (status, created_at);
