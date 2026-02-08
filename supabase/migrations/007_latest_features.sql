-- Migration: 007_latest_features.sql
-- Tables for: WebAuthn biometric auth, Gmail account extras, Drive file tracking,
-- session note reminders, and app_settings value type fix

-- ============================================
-- WEBAUTHN CREDENTIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES comm_users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_creds_user ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_creds_credential_id ON webauthn_credentials(credential_id);

-- ============================================
-- WEBAUTHN CHALLENGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  user_id UUID REFERENCES comm_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

-- Auto-cleanup expired challenges (run periodically or use pg_cron)
-- DELETE FROM webauthn_challenges WHERE expires_at < now();

-- ============================================
-- GMAIL ACCOUNTS EXTRAS
-- Add columns for better sync tracking
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gmail_accounts' AND column_name = 'name') THEN
    ALTER TABLE gmail_accounts ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gmail_accounts' AND column_name = 'is_active') THEN
    ALTER TABLE gmail_accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gmail_accounts' AND column_name = 'token_expiry') THEN
    ALTER TABLE gmail_accounts ADD COLUMN token_expiry TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gmail_accounts' AND column_name = 'last_sync_at') THEN
    ALTER TABLE gmail_accounts ADD COLUMN last_sync_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gmail_accounts' AND column_name = 'history_id') THEN
    ALTER TABLE gmail_accounts ADD COLUMN history_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gmail_accounts' AND column_name = 'sync_error') THEN
    ALTER TABLE gmail_accounts ADD COLUMN sync_error TEXT;
  END IF;
END $$;

-- ============================================
-- DRIVE FILES TABLE
-- Track Google Drive file uploads per clinical note
-- ============================================
CREATE TABLE IF NOT EXISTS drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES clinical_notes(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  drive_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  web_view_link TEXT,
  web_content_link TEXT,
  folder_id TEXT,
  file_size BIGINT,
  last_verified_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drive_files_note ON drive_files(note_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_client ON drive_files(client_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_drive_id ON drive_files(drive_file_id);

-- ============================================
-- APP SETTINGS VALUE TYPE UPDATE
-- Allow JSONB values (for calendar_urls array storage)
-- ============================================
DO $$
BEGIN
  -- Change value column from TEXT to JSONB if it's still TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'value' AND data_type = 'text'
  ) THEN
    ALTER TABLE app_settings ALTER COLUMN value TYPE JSONB USING value::jsonb;
  END IF;
EXCEPTION
  WHEN others THEN
    -- If conversion fails, leave as-is (values may not be valid JSON)
    NULL;
END $$;

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_webauthn_credentials_updated_at ON webauthn_credentials;
CREATE TRIGGER update_webauthn_credentials_updated_at
  BEFORE UPDATE ON webauthn_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drive_files_updated_at ON drive_files;
CREATE TRIGGER update_drive_files_updated_at
  BEFORE UPDATE ON drive_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to webauthn_credentials" ON webauthn_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to webauthn_challenges" ON webauthn_challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to drive_files" ON drive_files FOR ALL USING (true) WITH CHECK (true);
