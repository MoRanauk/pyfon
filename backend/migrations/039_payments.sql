CREATE TABLE IF NOT EXISTS order_payments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id),
  method text NOT NULL CHECK (method IN ('till_manual','mpesa_prompt','recorded')),
  status text NOT NULL DEFAULT 'awaiting' CHECK (status IN ('awaiting','confirmed','rejected')),
  claimed_code text,
  claimed_amount_kes integer CHECK (claimed_amount_kes IS NULL OR claimed_amount_kes > 0),
  amount_kes integer CHECK (amount_kes IS NULL OR amount_kes > 0),
  mpesa_code text,
  reject_reason text,
  money_entry_id bigint REFERENCES money_entries(id),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_by uuid REFERENCES users(id),
  handled_at timestamptz
);
CREATE INDEX IF NOT EXISTS order_payments_order_idx ON order_payments (order_id);
CREATE INDEX IF NOT EXISTS order_payments_status_idx ON order_payments (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS order_payments_code_once ON order_payments (mpesa_code) WHERE status = 'confirmed';
