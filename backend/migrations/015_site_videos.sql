CREATE TABLE IF NOT EXISTS site_videos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  storefront_code text NOT NULL REFERENCES storefronts (code),
  position smallint NOT NULL DEFAULT 1,
  title text NOT NULL,
  url text NOT NULL,
  poster_url text,
  public_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  archived_by text,
  archive_reason text
);
CREATE UNIQUE INDEX IF NOT EXISTS site_videos_active_pos ON site_videos (storefront_code, position) WHERE status = 'active';
