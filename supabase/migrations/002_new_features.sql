-- Migration: Add tables for new features
-- Features: Push notifications, Message templates, Daily summaries

-- Push notification device registrations
CREATE TABLE IF NOT EXISTS push_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id TEXT UNIQUE NOT NULL,
    user_id TEXT,
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_devices_user ON push_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_push_devices_active ON push_devices(is_active);

-- Message templates
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'custom',
    variables TEXT[] DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_usage ON message_templates(usage_count DESC);

-- Daily summaries for reporting
CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    stats JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date DESC);

-- Add metadata column to notifications if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Insert default message templates
INSERT INTO message_templates (name, content, category, variables, is_default) VALUES
    ('Quick Acknowledgment', 'Thank you for reaching out! I received your message and will get back to you shortly.', 'greeting', '{}', true),
    ('Appointment Confirmation', 'Your appointment is confirmed for {{date}} at {{time}}. Please let me know if you need to reschedule.', 'appointment', '{date,time}', true),
    ('Appointment Request', 'I would be happy to schedule an appointment. What days and times work best for you this week?', 'appointment', '{}', true),
    ('Follow-up Check', 'Hi {{name}}, I wanted to follow up on our previous conversation. Is there anything else I can help you with?', 'followup', '{name}', true),
    ('More Information Needed', 'Thank you for your message. To better assist you, could you please provide more details about {{topic}}?', 'info', '{topic}', true),
    ('Office Hours', 'Our office hours are Monday-Friday, 9 AM to 5 PM. Feel free to reach out during these times for immediate assistance.', 'info', '{}', true),
    ('Thank You', 'Thank you for your time today. Please don''t hesitate to reach out if you have any questions.', 'closing', '{}', true)
ON CONFLICT DO NOTHING;
