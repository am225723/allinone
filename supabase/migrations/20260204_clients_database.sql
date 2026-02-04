-- Client Database Migration
-- Creates tables for client management, contacts, identity matching, and import jobs

-- ============================================
-- CLIENTS TABLE
-- ============================================
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

-- ============================================
-- CLIENT CONTACTS TABLE
-- ============================================
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contacts_primary ON client_contacts(client_id, type) WHERE is_primary = true;

-- ============================================
-- INBOUND IDENTITY EVENTS TABLE
-- ============================================
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

-- ============================================
-- CLIENT IMPORT JOBS TABLE
-- ============================================
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

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- APPLY TRIGGERS
-- ============================================
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

-- ============================================
-- RLS POLICIES (if auth enabled)
-- ============================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_identity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to client_contacts" ON client_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to inbound_identity_events" ON inbound_identity_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to client_import_jobs" ON client_import_jobs FOR ALL USING (true) WITH CHECK (true);
