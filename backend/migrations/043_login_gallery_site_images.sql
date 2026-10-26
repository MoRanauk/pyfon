CREATE TABLE IF NOT EXISTS login_gallery (
  id bigserial PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('image', 'advert')),
  image_url text,
  public_id text,
  caption text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_gallery_kind_idx ON login_gallery (kind, active, position);

CREATE TABLE IF NOT EXISTS site_images (
  storefront text NOT NULL,
  slot text NOT NULL,
  url text NOT NULL,
  public_id text,
  alt text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (storefront, slot)
);
