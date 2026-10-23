CREATE TABLE IF NOT EXISTS code_vault (
  id serial PRIMARY KEY,
  label text NOT NULL,
  git_commit text,
  file_count integer NOT NULL,
  bytes integer NOT NULL,
  sha256 text NOT NULL,
  salt text NOT NULL,
  iv text NOT NULL,
  tag text NOT NULL,
  blob_b64 text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
