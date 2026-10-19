-- 024_sessions.sql: lets the developer sign people out everywhere
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valid_after timestamptz;
