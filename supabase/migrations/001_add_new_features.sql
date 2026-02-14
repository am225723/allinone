-- Migration: Add tables for new features
-- Features: Notifications, Saved Filters, Enhanced tracking

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

-- Add archived column to summaries if not exists
ALTER TABLE summaries 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add processed column to email_logs if not exists
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_summaries_archived ON summaries(archived);
CREATE INDEX IF NOT EXISTS idx_summaries_needs_response ON summaries(needs_response);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_processed ON email_logs(processed);
CREATE INDEX IF NOT EXISTS idx_email_logs_priority ON email_logs(priority);
CREATE INDEX IF NOT EXISTS idx_email_logs_needs_response ON email_logs(needs_response);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_draft_replies_status ON draft_replies(status);
CREATE INDEX IF NOT EXISTS idx_draft_replies_created_at ON draft_replies(created_at DESC);

-- Add updated_at trigger for notification_preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification preferences
INSERT INTO notification_preferences (id, enable_push, enable_email, enable_in_app, high_priority_only)
VALUES (gen_random_uuid(), true, false, true, false)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE notifications IS 'Stores in-app and push notifications';
COMMENT ON TABLE notification_preferences IS 'User notification preferences and settings';
COMMENT ON TABLE saved_filters IS 'User-saved search filters and smart views';