DROP INDEX IF EXISTS order_payments_code_once;
CREATE INDEX IF NOT EXISTS order_payments_code_idx ON order_payments (mpesa_code) WHERE mpesa_code IS NOT NULL;
