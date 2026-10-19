-- 023_csv_admin.sql: CSV uploads waiting for approval, and a flag for products edited by hand
ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS manager_edited boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS csv_import_batches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_name text NOT NULL,
  csv_text text NOT NULL,
  overwrite_manager boolean NOT NULL DEFAULT false,
  rows_total integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','cancelled')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz
);
