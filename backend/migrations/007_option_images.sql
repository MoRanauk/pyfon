-- 007_option_images.sql: photos that belong to one option value (e.g. Colour = Red)
CREATE TABLE item_option_images (
  item_id bigint NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  option_name text NOT NULL,
  option_value text NOT NULL,
  position smallint NOT NULL,
  file_name text NOT NULL,
  PRIMARY KEY (item_id, option_name, option_value, position)
);
CREATE INDEX item_option_images_file_idx ON item_option_images (file_name);
