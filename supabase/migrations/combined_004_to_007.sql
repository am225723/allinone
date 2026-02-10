-- ================================================================
-- COMBINED MIGRATION: 004 through 007 + Clients Database
-- Run this entire script in one go in the Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS checks)
-- ================================================================


-- ================================================================
-- PART 1: APP SETTINGS (Migration 004)
-- Adds missing columns to existing app_settings table
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'key') THEN
    ALTER TABLE app_settings ADD COLUMN key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'value') THEN
    ALTER TABLE app_settings ADD COLUMN value TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'category') THEN
    ALTER TABLE app_settings ADD COLUMN category TEXT;
  END IF;
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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'created_at') THEN
    ALTER TABLE app_settings ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
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


-- ================================================================
-- PART 2: COMM USERS (Migration 005)
-- ================================================================
CREATE TABLE IF NOT EXISTS comm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(4) NOT NULL DEFAULT '1234',
  name VARCHAR(255) DEFAULT 'Admin',
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_users_pin ON comm_users(pin);
CREATE INDEX IF NOT EXISTS idx_comm_users_active ON comm_users(is_active);

INSERT INTO comm_users (pin, name, role)
SELECT '1234', 'Admin', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM comm_users LIMIT 1);

CREATE OR REPLACE FUNCTION update_comm_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comm_users_updated_at ON comm_users;
CREATE TRIGGER comm_users_updated_at
  BEFORE UPDATE ON comm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_comm_users_updated_at();

ALTER TABLE comm_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comm_users' AND policyname = 'Allow read access') THEN
    CREATE POLICY "Allow read access" ON comm_users FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comm_users' AND policyname = 'Allow update access') THEN
    CREATE POLICY "Allow update access" ON comm_users FOR UPDATE USING (true);
  END IF;
END $$;


-- ================================================================
-- PART 3: CLINICAL NOTES (Migration 006)
-- ================================================================
CREATE TABLE IF NOT EXISTS note_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Medical',
    sections JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'Medical',
    created_by UUID REFERENCES comm_users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id TEXT,
    patient_name TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    template_id UUID REFERENCES note_templates(id),
    template_name TEXT,
    content JSONB DEFAULT '{}',
    generated_content TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'completed', 'archived')),
    pdf_url TEXT,
    drive_folder_id TEXT,
    created_by UUID REFERENCES comm_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES clinical_notes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    file_url TEXT,
    drive_file_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO note_templates (name, description, category, sections)
SELECT * FROM (VALUES
  ('SOAP Note', 'Standard medical documentation format', 'Medical', '["Subjective", "Objective", "Assessment", "Plan"]'::jsonb),
  ('Progress Note', 'Follow-up visit documentation', 'Medical', '["Chief Complaint", "History", "Examination", "Diagnosis", "Treatment"]'::jsonb),
  ('Initial Assessment', 'First visit comprehensive evaluation', 'Medical', '["Patient History", "Medical History", "Social History", "Review of Systems", "Physical Exam", "Assessment", "Plan"]'::jsonb),
  ('Discharge Summary', 'Patient discharge documentation', 'Medical', '["Admission Summary", "Hospital Course", "Discharge Diagnosis", "Discharge Medications", "Follow-up Instructions"]'::jsonb),
  ('Therapy Note', 'Mental health session notes', 'Mental Health', '["Session Summary", "Patient Presentation", "Interventions", "Progress", "Next Steps"]'::jsonb)
) AS t(name, description, category, sections)
WHERE NOT EXISTS (SELECT 1 FROM note_templates LIMIT 1);

INSERT INTO note_prompts (name, description, content, category)
SELECT * FROM (VALUES
  ('SOAP Structure', 'Standard SOAP note generation prompt', 'Generate a comprehensive SOAP note based on the provided information. Structure the note with clear sections for Subjective, Objective, Assessment, and Plan. Use professional medical terminology.', 'Medical'),
  ('Therapy Session', 'Mental health session notes', 'Generate therapy session notes including patient presentation, therapeutic interventions used, progress observations, and recommendations for follow-up.', 'Mental Health')
) AS t(name, description, content, category)
WHERE NOT EXISTS (SELECT 1 FROM note_prompts LIMIT 1);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_status ON clinical_notes(status);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_date ON clinical_notes(appointment_date);
CREATE INDEX IF NOT EXISTS idx_note_attachments_note ON note_attachments(note_id);


-- ================================================================
-- PART 4: CLIENTS DATABASE (Migration 20260204)
-- ================================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  dob DATE,
  mrn TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  last_visit_at TIMESTAMPTZ,
  notes_internal TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  insurance_provider TEXT,
  insurance_member_id TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_mrn ON clients(mrn) WHERE mrn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON clients(updated_at DESC);

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('phone', 'email')),
  value TEXT NOT NULL,
  label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'quo', 'gmail', 'import')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contacts_type_value ON client_contacts(type, value);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);

CREATE TABLE IF NOT EXISTS inbound_identity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('quo', 'gmail')),
  kind TEXT NOT NULL CHECK (kind IN ('phone', 'email')),
  value TEXT,
  display_value TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'linked', 'ignored')),
  linked_client_id UUID REFERENCES clients(id),
  meta JSONB,
  ignore_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_events_source_kind_status ON inbound_identity_events(source, kind, status);
CREATE INDEX IF NOT EXISTS idx_inbound_events_value ON inbound_identity_events(value) WHERE value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_events_status ON inbound_identity_events(status);

CREATE TABLE IF NOT EXISTS client_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_contacts_updated_at ON client_contacts;
CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inbound_events_updated_at ON inbound_identity_events;
CREATE TRIGGER update_inbound_events_updated_at
  BEFORE UPDATE ON inbound_identity_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_identity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_import_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Allow all access to clients') THEN
    CREATE POLICY "Allow all access to clients" ON clients FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_contacts' AND policyname = 'Allow all access to client_contacts') THEN
    CREATE POLICY "Allow all access to client_contacts" ON client_contacts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inbound_identity_events' AND policyname = 'Allow all access to inbound_identity_events') THEN
    CREATE POLICY "Allow all access to inbound_identity_events" ON inbound_identity_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_import_jobs' AND policyname = 'Allow all access to client_import_jobs') THEN
    CREATE POLICY "Allow all access to client_import_jobs" ON client_import_jobs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ================================================================
-- PART 5: LATEST FEATURES (Migration 007)
-- WebAuthn, Gmail extras, Drive files
-- ================================================================
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

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  user_id UUID REFERENCES comm_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gmail_accounts' AND table_schema = 'public') THEN
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
  END IF;
END $$;

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

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webauthn_credentials' AND policyname = 'Allow all access to webauthn_credentials') THEN
    CREATE POLICY "Allow all access to webauthn_credentials" ON webauthn_credentials FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webauthn_challenges' AND policyname = 'Allow all access to webauthn_challenges') THEN
    CREATE POLICY "Allow all access to webauthn_challenges" ON webauthn_challenges FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drive_files' AND policyname = 'Allow all access to drive_files') THEN
    CREATE POLICY "Allow all access to drive_files" ON drive_files FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ================================================================
-- DONE! All migrations 004-007 + clients database applied.
-- ================================================================
