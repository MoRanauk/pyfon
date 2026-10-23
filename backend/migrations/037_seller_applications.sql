CREATE TABLE IF NOT EXISTS seller_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  role text NOT NULL CHECK (role IN ('dealer', 'designer', 'both')),
  link text,
  about text NOT NULL,
  shop text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seller_applications_status_idx ON seller_applications (status, created_at DESC);
