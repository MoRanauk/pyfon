ALTER TABLE interfaces DROP CONSTRAINT IF EXISTS interfaces_kind_check;
ALTER TABLE interfaces ADD CONSTRAINT interfaces_kind_check CHECK (kind IN ('customer', 'partner', 'developer', 'vendor'));
INSERT INTO interfaces (code, name, kind) VALUES ('vendor', 'Dealer Portal', 'vendor') ON CONFLICT (code) DO NOTHING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_code text REFERENCES vendors (code);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vendor_code_role;
ALTER TABLE users ADD CONSTRAINT users_vendor_code_role CHECK ((role = 'vendor') = (vendor_code IS NOT NULL));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS vendor_status text NOT NULL DEFAULT 'offered'
  CHECK (vendor_status IN ('offered', 'accepted', 'in_progress', 'ready'));
