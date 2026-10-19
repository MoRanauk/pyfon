-- 020_partner_messages.sql
CREATE TABLE IF NOT EXISTS partner_messages (
  id bigserial PRIMARY KEY,
  from_user_id uuid NOT NULL REFERENCES users(id),
  to_user_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS partner_messages_pair_idx ON partner_messages (from_user_id, to_user_id, id);
