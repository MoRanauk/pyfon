CREATE TABLE interfaces (
  code text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('customer', 'partner', 'developer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO interfaces (code, name, kind) VALUES
  ('mco', 'M & Co. Brands', 'customer'),
  ('prestige', 'Prestige M', 'customer'),
  ('trim', 'TriM Atelier', 'customer'),
  ('m3-creative', 'M3 Labs (Creative)', 'partner'),
  ('m3-production', 'M3 Labs (Production)', 'partner'),
  ('m3-finance', 'M3 Labs (Finance and Delivery)', 'partner'),
  ('dev', 'Developer Console', 'developer');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'partner', 'developer', 'vendor')),
  partner_stage text CHECK (partner_stage IN ('creative', 'production', 'finance')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'partner') = (partner_stage IS NOT NULL))
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  request_id text,
  interface text,
  actor_user_id uuid REFERENCES users (id),
  acting_for_user_id uuid REFERENCES users (id),
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);

CREATE FUNCTION audit_log_block_changes() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_change
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_block_changes();

CREATE TABLE request_log (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  request_id text NOT NULL,
  interface text,
  user_id uuid,
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  duration_ms integer NOT NULL
);
CREATE INDEX request_log_at_idx ON request_log (at DESC);
