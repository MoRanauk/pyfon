CREATE TABLE IF NOT EXISTS code_notes (
  path text PRIMARY KEY,
  note text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
