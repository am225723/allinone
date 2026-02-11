-- ================================================================
-- MIGRATION 008: comm_users RLS policies + unique PIN constraint
-- Run this in the Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS checks)
-- ================================================================

-- Add INSERT policy so admin can create users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comm_users' AND policyname = 'Allow insert access') THEN
    CREATE POLICY "Allow insert access" ON comm_users FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comm_users' AND policyname = 'Allow delete access') THEN
    CREATE POLICY "Allow delete access" ON comm_users FOR DELETE USING (true);
  END IF;
END $$;

-- Add unique constraint on PIN so no two active users share a PIN
-- (uses a partial unique index on active users only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_users_pin_unique
  ON comm_users (pin) WHERE is_active = true;
