-- 003_catalog.sql: products and services, storefronts, categories, images, import log

CREATE TABLE storefronts (
  code text PRIMARY KEY,
  name text NOT NULL
);
INSERT INTO storefronts (code, name) VALUES
  ('mco', 'M & Co. Brands'),
  ('prestige', 'Prestige M'),
  ('trim', 'TriM Atelier');

CREATE TABLE categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE
);

CREATE TABLE catalog_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('product', 'service')),
  name text NOT NULL,
  category_id bigint NOT NULL REFERENCES categories(id),
  subcategory text,
  description text NOT NULL DEFAULT '',
  price_type text NOT NULL CHECK (price_type IN ('fixed', 'from', 'quote')),
  price_kes integer CHECK (price_kes IS NULL OR price_kes >= 0),
  compare_at_price_kes integer CHECK (compare_at_price_kes IS NULL OR compare_at_price_kes >= 0),
  min_order_qty integer NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  personalization text[] NOT NULL DEFAULT '{}',
  vendor_code text,
  stock_status text NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'made_to_order', 'out_of_stock')),
  stock_qty integer CHECK (stock_qty IS NULL OR stock_qty >= 0),
  lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  tags text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'draft' OR price_type = 'quote' OR price_kes IS NOT NULL),
  CHECK (price_type <> 'quote' OR price_kes IS NULL)
);
CREATE INDEX catalog_items_category_idx ON catalog_items (category_id);
CREATE INDEX catalog_items_status_idx ON catalog_items (status);

CREATE TABLE item_storefronts (
  item_id bigint NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  storefront_code text NOT NULL REFERENCES storefronts(code),
  PRIMARY KEY (item_id, storefront_code)
);
CREATE INDEX item_storefronts_code_idx ON item_storefronts (storefront_code);

CREATE TABLE item_images (
  item_id bigint NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  position smallint NOT NULL,
  file_name text NOT NULL,
  PRIMARY KEY (item_id, position)
);
CREATE INDEX item_images_file_idx ON item_images (file_name);

CREATE TABLE import_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  source_file text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('dry_run', 'apply')),
  run_by text NOT NULL,
  rows_total integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);
