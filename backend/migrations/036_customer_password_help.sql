CREATE TABLE IF NOT EXISTS customer_password_help (
  id bigserial PRIMARY KEY,
  user_id uuid,
  email text NOT NULL,
  shop text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','ignored')),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_by uuid,
  handled_at timestamptz
);
CREATE INDEX IF NOT EXISTS customer_password_help_status ON customer_password_help (status, created_at DESC);
