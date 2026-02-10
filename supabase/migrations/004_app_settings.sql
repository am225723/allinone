-- Migration 004: Add missing columns to existing app_settings table
-- The table already has: id (uuid), treatment_plan_prompt (text), updated_at (timestamptz)
-- This adds columns needed by the app code for settings and key/value storage

DO $$
BEGIN
  -- Generic key/value columns (used by calendar URLs, PIN storage, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'key') THEN
    ALTER TABLE app_settings ADD COLUMN key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'value') THEN
    ALTER TABLE app_settings ADD COLUMN value TEXT;
  END IF;

  -- Category column (used by openphone/gmail settings)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'category') THEN
    ALTER TABLE app_settings ADD COLUMN category TEXT;
  END IF;

  -- OpenPhone settings columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'api_key') THEN
    ALTER TABLE app_settings ADD COLUMN api_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'auto_reply') THEN
    ALTER TABLE app_settings ADD COLUMN auto_reply BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'max_conversations') THEN
    ALTER TABLE app_settings ADD COLUMN max_conversations INTEGER DEFAULT 25;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'blocked_phones') THEN
    ALTER TABLE app_settings ADD COLUMN blocked_phones TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'blocked_phrases') THEN
    ALTER TABLE app_settings ADD COLUMN blocked_phrases TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'custom_signature') THEN
    ALTER TABLE app_settings ADD COLUMN custom_signature TEXT DEFAULT '';
  END IF;

  -- Gmail settings columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'lookback_days') THEN
    ALTER TABLE app_settings ADD COLUMN lookback_days INTEGER DEFAULT 14;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'auto_triage') THEN
    ALTER TABLE app_settings ADD COLUMN auto_triage BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'skip_senders') THEN
    ALTER TABLE app_settings ADD COLUMN skip_senders TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'skip_subjects') THEN
    ALTER TABLE app_settings ADD COLUMN skip_subjects TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'triage_interval') THEN
    ALTER TABLE app_settings ADD COLUMN triage_interval INTEGER DEFAULT 4;
  END IF;

  -- Created_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'created_at') THEN
    ALTER TABLE app_settings ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Index for key lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Trigger for updated_at
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
