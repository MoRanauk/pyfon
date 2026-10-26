ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS batch_id uuid;
CREATE INDEX IF NOT EXISTS order_payments_batch_idx ON order_payments (batch_id) WHERE batch_id IS NOT NULL;
