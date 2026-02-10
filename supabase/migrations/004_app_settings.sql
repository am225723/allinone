-- Migration 004: Add key/value columns to existing app_settings table
-- The app_settings table already exists with category-based columns.
-- This adds a generic key/value pair capability for new features (calendar URLs, PIN, etc.)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'key') THEN
    ALTER TABLE app_settings ADD COLUMN key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'value') THEN
    ALTER TABLE app_settings ADD COLUMN value TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();
