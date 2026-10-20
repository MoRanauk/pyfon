CREATE TABLE IF NOT EXISTS password_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  note text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_by uuid,
  handled_at timestamptz
);
CREATE INDEX IF NOT EXISTS password_help_status_idx ON password_help_requests (status, created_at DESC);
