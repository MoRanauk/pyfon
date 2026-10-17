ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}';
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE item_images ADD COLUMN IF NOT EXISTS public_id text;
CREATE TABLE IF NOT EXISTS item_designs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id bigint NOT NULL REFERENCES catalog_items (id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 1,
  name text NOT NULL,
  url text NOT NULL,
  public_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_designs_item_idx ON item_designs (item_id, position);
ALTER TABLE order_lines ADD COLUMN IF NOT EXISTS design_id bigint REFERENCES item_designs (id) ON DELETE SET NULL;
ALTER TABLE order_lines ADD COLUMN IF NOT EXISTS design_name text;
ALTER TABLE order_lines ADD COLUMN IF NOT EXISTS design_url text;
