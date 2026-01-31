-- App Settings table for storing configuration like PIN
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on key for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insert default PIN (123456) - should be changed immediately
INSERT INTO app_settings (key, value) VALUES ('app_pin', '123456')
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- RLS policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage settings" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);
