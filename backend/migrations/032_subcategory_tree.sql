ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS parent_id bigint;
DROP INDEX IF EXISTS subcategories_cat_name;
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_tree_name ON subcategories (category_id, coalesce(parent_id, 0), lower(name));
