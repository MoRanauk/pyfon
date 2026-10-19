-- 021_chat_extras.sql
ALTER TABLE partner_messages ALTER COLUMN to_user_id DROP NOT NULL;
ALTER TABLE partner_messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';
ALTER TABLE partner_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE partner_messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE partner_messages ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE partner_messages DROP CONSTRAINT IF EXISTS partner_messages_body_check;
ALTER TABLE partner_messages ADD CONSTRAINT partner_messages_body_check CHECK (char_length(body) <= 2000);
CREATE TABLE IF NOT EXISTS partner_group_reads (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  last_id bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS partner_messages_group_idx ON partner_messages (id) WHERE to_user_id IS NULL;
