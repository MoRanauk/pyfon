CREATE TABLE IF NOT EXISTS subcategories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id bigint NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_cat_name ON subcategories (category_id, lower(name));
INSERT INTO subcategories (category_id, name)
SELECT DISTINCT ON (i.category_id, lower(trim(i.subcategory))) i.category_id, trim(i.subcategory)
FROM catalog_items i
WHERE i.subcategory IS NOT NULL AND trim(i.subcategory) <> ''
ON CONFLICT DO NOTHING;
