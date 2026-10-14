ALTER TABLE approval_requests
  ADD COLUMN executed_at timestamptz,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN result jsonb;
CREATE INDEX IF NOT EXISTS approval_requests_status_idx ON approval_requests (status);
