CREATE TABLE IF NOT EXISTS social_links (
  id bigserial PRIMARY KEY,
  store text NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store, platform)
);
