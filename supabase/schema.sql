-- ===========================================
-- UNIFIED COMMUNICATIONS DASHBOARD
-- Database Schema for Supabase
-- ===========================================

-- =====================
-- OPENPHONE TABLES
-- =====================

-- Runs: Track cleanup run sessions
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed')),
  checkpoint JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Summaries: Conversation summaries from runs
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_range TEXT NOT NULL,
  summary TEXT NOT NULL,
  topics TEXT[] NOT NULL DEFAULT '{}',
  needs_response BOOLEAN NOT NULL DEFAULT false,
  suppress_response BOOLEAN NOT NULL DEFAULT false,
  last_inbound TEXT,
  last_outbound TEXT,
  last_message_at TIMESTAMPTZ,
  needs_response_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS summaries_run_id_idx ON summaries(run_id);
CREATE INDEX IF NOT EXISTS summaries_phone_idx ON summaries(phone);
CREATE INDEX IF NOT EXISTS summaries_needs_response_idx ON summaries(needs_response);

-- Draft status enum
DO $$ BEGIN
  CREATE TYPE draft_status AS ENUM ('pending', 'approved', 'rejected', 'sent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Draft Replies: SMS draft replies for review
CREATE TABLE IF NOT EXISTS draft_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  from_phone_number_id TEXT NOT NULL,
  user_id TEXT,
  draft_text TEXT NOT NULL,
  status draft_status NOT NULL DEFAULT 'pending',
  suppressed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS draft_replies_status_idx ON draft_replies(status);
CREATE INDEX IF NOT EXISTS draft_replies_run_id_idx ON draft_replies(run_id);

-- Contact update status enum
DO $$ BEGIN
  CREATE TYPE contact_update_status AS ENUM ('pending', 'approved', 'denied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Contact Update Suggestions: Inferred names for unknown contacts
CREATE TABLE IF NOT EXISTS contact_update_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  inferred_name TEXT NOT NULL,
  source_message_id TEXT,
  rationale TEXT,
  status contact_update_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone, inferred_name, source_message_id)
);

CREATE INDEX IF NOT EXISTS contact_update_suggestions_status_idx ON contact_update_suggestions(status);

-- Contact Map: Phone to contact ID mapping
CREATE TABLE IF NOT EXISTS contact_map (
  phone TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppressions: Block auto-drafting for certain phones/conversations/phrases
CREATE TABLE IF NOT EXISTS suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('phone', 'conversation', 'phrase')),
  value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppressions_kind_value_idx ON suppressions(kind, value);

-- Resolved Contacts: Manually resolved contacts (hides needs_response)
CREATE TABLE IF NOT EXISTS resolved_contacts (
  phone TEXT PRIMARY KEY,
  note TEXT,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- GMAIL TABLES
-- =====================

-- Gmail Accounts: Connected Gmail accounts via OAuth
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gmail_accounts_email_idx ON gmail_accounts(email);

-- Email Logs: Processed email records
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_account_id UUID REFERENCES gmail_accounts(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  subject TEXT,
  from_address TEXT,
  summary TEXT,
  needs_response BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  draft_created BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_gmail_account_id_idx ON email_logs(gmail_account_id);
CREATE INDEX IF NOT EXISTS email_logs_gmail_message_id_idx ON email_logs(gmail_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_account_message_idx ON email_logs(gmail_account_id, gmail_message_id);

-- Agent Rules: Skip rules for email triage
CREATE TABLE IF NOT EXISTS agent_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_account_id UUID REFERENCES gmail_accounts(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('skip_sender', 'skip_subject')),
  pattern TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_rules_gmail_account_id_idx ON agent_rules(gmail_account_id);
CREATE INDEX IF NOT EXISTS agent_rules_enabled_idx ON agent_rules(is_enabled);

-- Agent Settings: Per-account triage settings
CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_account_id UUID UNIQUE REFERENCES gmail_accounts(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  run_mode TEXT DEFAULT 'manual' CHECK (run_mode IN ('manual', 'scheduled')),
  period_minutes INTEGER DEFAULT 60,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables (configure policies as needed)
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_update_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolved_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

-- For service role access (bypass RLS)
-- These policies allow the service role to access all data
CREATE POLICY "Service role access" ON runs FOR ALL USING (true);
CREATE POLICY "Service role access" ON summaries FOR ALL USING (true);
CREATE POLICY "Service role access" ON draft_replies FOR ALL USING (true);
CREATE POLICY "Service role access" ON contact_update_suggestions FOR ALL USING (true);
CREATE POLICY "Service role access" ON contact_map FOR ALL USING (true);
CREATE POLICY "Service role access" ON suppressions FOR ALL USING (true);
CREATE POLICY "Service role access" ON resolved_contacts FOR ALL USING (true);
CREATE POLICY "Service role access" ON gmail_accounts FOR ALL USING (true);
CREATE POLICY "Service role access" ON email_logs FOR ALL USING (true);
CREATE POLICY "Service role access" ON agent_rules FOR ALL USING (true);
CREATE POLICY "Service role access" ON agent_settings FOR ALL USING (true);