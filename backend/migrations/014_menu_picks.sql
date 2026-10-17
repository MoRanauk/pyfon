CREATE TABLE IF NOT EXISTS item_menu_picks (
  item_id bigint NOT NULL REFERENCES catalog_items (id) ON DELETE CASCADE,
  node_slug text NOT NULL,
  PRIMARY KEY (item_id, node_slug)
);
