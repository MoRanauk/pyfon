CREATE TABLE IF NOT EXISTS mpesa_stk_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id bigint NOT NULL REFERENCES order_payments(id),
  checkout_request_id text NOT NULL UNIQUE,
  merchant_request_id text,
  phone_last4 text,
  amount_kes integer NOT NULL CHECK (amount_kes > 0),
  env text NOT NULL,
  result_code integer,
  result_desc text,
  receipt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS mpesa_stk_payment_idx ON mpesa_stk_requests (payment_id);
