-- ===========================================
-- UNIFIED COMMUNICATIONS DASHBOARD
-- Complete Database Schema for Supabase
-- Optimized for Edge Functions
-- ===========================================
-- 
-- This script creates all tables, indexes, and RLS policies
-- needed for the Unified Communications Dashboard.
--
-- Execute this script in Supabase SQL Editor in the following order:
-- 1. Run this file (complete_schema.sql)
-- 2. Run setup_environment_variables.sql (for reference on environment variables)
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

CREATE INDEX IF NOT EXISTS runs_status_idx ON runs(status);
CREATE INDEX IF NOT EXISTS runs_created_at_idx ON runs(created_at DESC);

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
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS summaries_run_id_idx ON summaries(run_id);
CREATE INDEX IF NOT EXISTS summaries_phone_idx ON summaries(phone);
CREATE INDEX IF NOT EXISTS summaries_needs_response_idx ON summaries(needs_response);
CREATE INDEX IF NOT EXISTS summaries_archived_idx ON summaries(archived);
CREATE INDEX IF NOT EXISTS summaries_created_at_idx ON summaries(created_at DESC);

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
CREATE INDEX IF NOT EXISTS draft_replies_created_at_idx ON draft_replies(created_at DESC);

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
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_logs_gmail_account_id_idx ON email_logs(gmail_account_id);
CREATE INDEX IF NOT EXISTS email_logs_gmail_message_id_idx ON email_logs(gmail_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS email_logs_account_message_idx ON email_logs(gmail_account_id, gmail_message_id);
CREATE INDEX IF NOT EXISTS email_logs_processed_idx ON email_logs(processed);
CREATE INDEX IF NOT EXISTS email_logs_priority_idx ON email_logs(priority);
CREATE INDEX IF NOT EXISTS email_logs_needs_response_idx ON email_logs(needs_response);
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx ON email_logs(created_at DESC);

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
-- NOTIFICATIONS & FILTERS
-- =====================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('urgent', 'normal', 'info')),
  channel TEXT NOT NULL CHECK (channel IN ('openphone', 'gmail', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'normal', 'low')),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_push BOOLEAN DEFAULT TRUE,
  enable_email BOOLEAN DEFAULT FALSE,
  enable_in_app BOOLEAN DEFAULT TRUE,
  high_priority_only BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  channels JSONB DEFAULT '{"openphone": true, "gmail": true, "system": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved filters table
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  params JSONB NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- TRIGGERS
-- =====================

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at column
DROP TRIGGER IF EXISTS update_runs_updated_at ON runs;
CREATE TRIGGER update_runs_updated_at
  BEFORE UPDATE ON runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_draft_replies_updated_at ON draft_replies;
CREATE TRIGGER update_draft_replies_updated_at
  BEFORE UPDATE ON draft_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_update_suggestions_updated_at ON contact_update_suggestions;
CREATE TRIGGER update_contact_update_suggestions_updated_at
  BEFORE UPDATE ON contact_update_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gmail_accounts_updated_at ON gmail_accounts;
CREATE TRIGGER update_gmail_accounts_updated_at
  BEFORE UPDATE ON gmail_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_rules_updated_at ON agent_rules;
CREATE TRIGGER update_agent_rules_updated_at
  BEFORE UPDATE ON agent_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_settings_updated_at ON agent_settings;
CREATE TRIGGER update_agent_settings_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_filters_updated_at ON saved_filters;
CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
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
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Service role policies (allow full access)
DROP POLICY IF EXISTS "Service role access on runs" ON runs;
CREATE POLICY "Service role access on runs" ON runs FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on summaries" ON summaries;
CREATE POLICY "Service role access on summaries" ON summaries FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on draft_replies" ON draft_replies;
CREATE POLICY "Service role access on draft_replies" ON draft_replies FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on contact_update_suggestions" ON contact_update_suggestions;
CREATE POLICY "Service role access on contact_update_suggestions" ON contact_update_suggestions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on contact_map" ON contact_map;
CREATE POLICY "Service role access on contact_map" ON contact_map FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on suppressions" ON suppressions;
CREATE POLICY "Service role access on suppressions" ON suppressions FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on resolved_contacts" ON resolved_contacts;
CREATE POLICY "Service role access on resolved_contacts" ON resolved_contacts FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on gmail_accounts" ON gmail_accounts;
CREATE POLICY "Service role access on gmail_accounts" ON gmail_accounts FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on email_logs" ON email_logs;
CREATE POLICY "Service role access on email_logs" ON email_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on agent_rules" ON agent_rules;
CREATE POLICY "Service role access on agent_rules" ON agent_rules FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on agent_settings" ON agent_settings;
CREATE POLICY "Service role access on agent_settings" ON agent_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on notifications" ON notifications;
CREATE POLICY "Service role access on notifications" ON notifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on notification_preferences" ON notification_preferences;
CREATE POLICY "Service role access on notification_preferences" ON notification_preferences FOR ALL USING (true);

DROP POLICY IF EXISTS "Service role access on saved_filters" ON saved_filters;
CREATE POLICY "Service role access on saved_filters" ON saved_filters FOR ALL USING (true);

-- =====================
-- DEFAULT DATA
-- =====================

-- Insert default notification preferences
INSERT INTO notification_preferences (id, enable_push, enable_email, enable_in_app, high_priority_only)
VALUES (gen_random_uuid(), true, false, true, false)
ON CONFLICT DO NOTHING;

-- =====================
-- COMMENTS
-- ===========================

COMMENT ON TABLE runs IS 'Track cleanup run sessions for OpenPhone conversations';
COMMENT ON TABLE summaries IS 'Conversation summaries with AI analysis';
COMMENT ON TABLE draft_replies IS 'SMS draft replies pending review';
COMMENT ON TABLE contact_update_suggestions IS 'AI-inferred contact names for review';
COMMENT ON TABLE contact_map IS 'Phone number to contact ID mapping';
COMMENT ON TABLE suppressions IS 'Rules to block auto-drafting for specific phones/conversations/phrases';
COMMENT ON TABLE resolved_contacts IS 'Manually resolved contacts (hides needs_response flag)';
COMMENT ON TABLE gmail_accounts IS 'Connected Gmail accounts with OAuth tokens';
COMMENT ON TABLE email_logs IS 'Processed email records with AI triage';
COMMENT ON TABLE agent_rules IS 'Skip rules for email triage (sender/subject)';
COMMENT ON TABLE agent_settings IS 'Per-account email triage settings';
COMMENT ON TABLE notifications IS 'In-app and push notifications';
COMMENT ON TABLE notification_preferences IS 'User notification preferences';
COMMENT ON TABLE saved_filters IS 'User-saved search filters and smart views';

-- ===========================================
-- SETUP COMPLETE
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'SCHEMA SETUP COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created: 13';
  RAISE NOTICE 'Indexes created: 30+';
  RAISE NOTICE 'Triggers created: 9';
  RAISE NOTICE 'RLS policies created: 13';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run setup_environment_variables.sql for reference';
  RAISE NOTICE '2. Set environment variables in Supabase Dashboard or CLI';
  RAISE NOTICE '3. Deploy Edge Functions using Supabase CLI';
  RAISE NOTICE '4. Test the Edge Functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Edge Functions to deploy:';
  RAISE NOTICE '- stats';
  RAISE NOTICE '- search';
  RAISE NOTICE '- notifications';
  RAISE NOTICE '- bulk-actions';
  RAISE NOTICE '- ai-analyze';
  RAISE NOTICE '- openphone-run';
  RAISE NOTICE '- openphone-runs';
  RAISE NOTICE '- openphone-summaries';
  RAIZE NOTICE '- openphone-drafts';
  RAISE NOTICE '- openphone-approve';
  RAISE NOTICE '- openphone-reject';
  RAISE NOTICE '- openphone-send-approved';
  RAISE NOTICE '- gmail-triage';
  RAISE NOTICE '- gmail-activity';
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
END $$;