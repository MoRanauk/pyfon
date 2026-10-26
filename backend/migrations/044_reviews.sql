CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront text NOT NULL CHECK (storefront IN ('mco','prestige','trim')),
  sku text,
  user_id uuid REFERENCES users(id),
  display_name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL,
  edited_body text,
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','hidden')),
  handled_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS reviews_store_status_idx ON reviews (storefront, status, published_at DESC);
CREATE INDEX IF NOT EXISTS reviews_sku_idx ON reviews (sku);
