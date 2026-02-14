-- Migration: Add users table for SSO authentication
-- This migration creates a users table to support SSO login functionality

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to read their own user data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

-- Allow service role to insert users (for SSO)
CREATE POLICY "Service role can create users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Allow service role to update users
CREATE POLICY "Service role can update users"
  ON users FOR UPDATE
  USING (true);

-- Allow anyone to read user by email (for SSO lookup)
CREATE POLICY "Anyone can read users by email"
  ON users FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON users TO service_role;
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;