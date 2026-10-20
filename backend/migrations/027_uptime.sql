CREATE TABLE IF NOT EXISTS uptime_checks (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  db_ms integer,
  note text
);
CREATE INDEX IF NOT EXISTS uptime_checks_at_idx ON uptime_checks (at);
