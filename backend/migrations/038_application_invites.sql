ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS handled_by uuid;
ALTER TABLE seller_applications ADD COLUMN IF NOT EXISTS handled_at timestamptz;
CREATE TABLE IF NOT EXISTS application_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES seller_applications (id),
  token_hash text NOT NULL UNIQUE,
  vendor_code text NOT NULL,
  email text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX IF NOT EXISTS application_invites_app_idx ON application_invites (application_id);
