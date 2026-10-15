-- 006_taxonomy.sql: menu tree (any depth) and which items sit in which node
CREATE TABLE taxonomy_nodes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id bigint REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  link text,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX taxonomy_nodes_parent_idx ON taxonomy_nodes (parent_id);

CREATE TABLE item_nodes (
  item_id bigint NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  node_id bigint NOT NULL REFERENCES taxonomy_nodes(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, node_id)
);
CREATE INDEX item_nodes_node_idx ON item_nodes (node_id);
