CREATE TABLE IF NOT EXISTS site_content (
  storefront text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}',
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS site_content_history (
  id serial PRIMARY KEY,
  storefront text NOT NULL,
  data jsonb NOT NULL,
  updated_by text,
  at timestamptz NOT NULL DEFAULT now()
);
