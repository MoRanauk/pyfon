-- 022_connect_sends.sql: who sent a Connect message, and by which channel
ALTER TABLE outbound_messages ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE outbound_messages ADD COLUMN IF NOT EXISTS sent_by uuid;
ALTER TABLE outbound_messages ADD COLUMN IF NOT EXISTS to_name text;
