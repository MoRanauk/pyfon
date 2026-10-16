CREATE TABLE IF NOT EXISTS vendors (
  code text PRIMARY KEY CHECK (code ~ '^[A-Za-z0-9-]{2,30}$'),
  name text NOT NULL,
  speciality text NOT NULL,
  blurb text,
  phone text,
  image text,
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','hidden')),
  created_at timestamptz NOT NULL DEFAULT now()
);
