-- Migration: Create comm_users table for PIN authentication
-- Run this migration in your Supabase SQL editor

-- Create comm_users table
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

-- Create index on pin for faster lookups
CREATE INDEX IF NOT EXISTS idx_comm_users_pin ON comm_users(pin);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_comm_users_active ON comm_users(is_active);

-- Insert default admin user with PIN 1234
INSERT INTO comm_users (pin, name, role)
VALUES ('1234', 'Admin', 'admin')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
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

-- Add RLS policies (optional but recommended)
ALTER TABLE comm_users ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read
CREATE POLICY "Allow read access" ON comm_users
  FOR SELECT USING (true);

-- Policy to allow updates (for PIN changes)
CREATE POLICY "Allow update access" ON comm_users
  FOR UPDATE USING (true);
