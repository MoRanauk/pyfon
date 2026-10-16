CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
INSERT INTO app_settings (key, value) VALUES ('whatsapp_mode', 'direct')
ON CONFLICT (key) DO NOTHING;
