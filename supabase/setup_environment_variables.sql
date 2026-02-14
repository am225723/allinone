-- ===========================================
-- EDGE FUNCTIONS ENVIRONMENT VARIABLES SETUP
-- ===========================================
-- This SQL script documents all environment variables
-- needed for the Edge Functions to work properly.
--
-- Run this script in Supabase SQL Editor to understand
-- what environment variables need to be configured.
-- ===========================================

-- NOTE: Environment variables for Edge Functions must be set
-- via Supabase CLI or Dashboard, not via SQL commands.
--
-- Use one of these methods to set environment variables:
--
-- Method 1: Supabase Dashboard
-- 1. Go to your Supabase project
-- 2. Navigate to Edge Functions
-- 3. Click "Settings" (gear icon)
-- 4. Add each environment variable below
--
-- Method 2: Supabase CLI
-- supabase secrets set VAR_NAME="value"
--
-- ===========================================
-- REQUIRED ENVIRONMENT VARIABLES
-- ===========================================

-- 1. SUPABASE_URL
-- Description: Your Supabase project URL
-- Example: https://your-project.supabase.co
-- Source: Supabase Dashboard → Settings → API → Project URL
SET client_min_messages TO notice;
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: SUPABASE_URL';
  RAISE NOTICE 'Description: Your Supabase project URL';
  RAISE NOTICE 'Example: https://your-project.supabase.co';
  RAISE NOTICE 'Source: Supabase Dashboard → Settings → API → Project URL';
  RAISE NOTICE '';
END $$;

-- 2. SUPABASE_SERVICE_ROLE_KEY
-- Description: Service role key for full database access
-- Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
-- Source: Supabase Dashboard → Settings → API → service_role secret
-- WARNING: Keep this key secure! Never expose it client-side.
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: SUPABASE_SERVICE_ROLE_KEY';
  RAISE NOTICE 'Description: Service role key for full database access';
  RAISE NOTICE 'WARNING: Keep this key secure! Never expose it client-side.';
  RAISE NOTICE 'Source: Supabase Dashboard → Settings → API → service_role secret';
  RAISE NOTICE '';
END $$;

-- 3. OPENPHONE_API_KEY
-- Description: API key for OpenPhone integration
-- Example: op_live_1234567890abcdef
-- Source: OpenPhone Dashboard → Settings → API
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: OPENPHONE_API_KEY';
  RAISE NOTICE 'Description: API key for OpenPhone integration';
  RAISE NOTICE 'Example: op_live_1234567890abcdef';
  RAISE NOTICE 'Source: OpenPhone Dashboard → Settings → API';
  RAISE NOTICE '';
END $$;

-- 4. PERPLEXITY_API_KEY
-- Description: API key for Perplexity AI (all AI features)
-- Example: pplx-1234567890abcdef
-- Source: Perplexity AI Console → Settings → API Access
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: PERPLEXITY_API_KEY';
  RAISE NOTICE 'Description: API key for Perplexity AI (all AI features)';
  RAISE NOTICE 'Example: pplx-1234567890abcdef';
  RAISE NOTICE 'Source: Perplexity AI Console → Settings → API Access';
  RAISE NOTICE '';
END $$;

-- 5. GOOGLE_CLIENT_ID
-- Description: Google OAuth 2.0 Client ID for Gmail integration
-- Example: 123456789-abcdef.apps.googleusercontent.com
-- Source: Google Cloud Console → Credentials → OAuth 2.0 Client ID
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: GOOGLE_CLIENT_ID';
  RAISE NOTICE 'Description: Google OAuth 2.0 Client ID for Gmail integration';
  RAISE NOTICE 'Example: 123456789-abcdef.apps.googleusercontent.com';
  RAISE NOTICE 'Source: Google Cloud Console → Credentials → OAuth 2.0 Client ID';
  RAISE NOTICE '';
END $$;

-- 6. GOOGLE_CLIENT_SECRET
-- Description: Google OAuth 2.0 Client Secret for Gmail integration
-- Example: GOCSPX-1234567890abcdef
-- Source: Google Cloud Console → Credentials → OAuth 2.0 Client Secret
-- WARNING: Keep this secret secure!
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: GOOGLE_CLIENT_SECRET';
  RAISE NOTICE 'Description: Google OAuth 2.0 Client Secret for Gmail integration';
  RAISE NOTICE 'WARNING: Keep this secret secure!';
  RAISE NOTICE 'Source: Google Cloud Console → Credentials → OAuth 2.0 Client Secret';
  RAISE NOTICE '';
END $$;

-- ===========================================
-- OPTIONAL ENVIRONMENT VARIABLES
-- ===========================================

-- 7. MAX_CONVERSATIONS_PER_RUN
-- Description: Maximum number of conversations to process in one run
-- Default: 25
-- Example: 25, 50, 100
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: MAX_CONVERSATIONS_PER_RUN';
  RAISE NOTICE 'Description: Maximum number of conversations to process in one run';
  RAISE NOTICE 'Default: 25';
  RAISE NOTICE 'Example: 25, 50, 100';
  RAISE NOTICE '';
END $$;

-- 8. RESPONSE_BLOCKLIST_PHONES
-- Description: Comma-separated list of phone numbers to block auto-response
-- Example: +15551234567,+15559876543
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: RESPONSE_BLOCKLIST_PHONES';
  RAISE NOTICE 'Description: Comma-separated list of phone numbers to block auto-response';
  RAISE NOTICE 'Example: +15551234567,+15559876543';
  RAISE NOTICE '';
END $$;

-- 9. RESPONSE_BLOCKLIST_PHRASES
-- Description: Comma-separated list of phrases that block auto-response
-- Example: unsubscribe,do not reply,stop
DO $$
BEGIN
  RAISE NOTICE 'Environment Variable: RESPONSE_BLOCKLIST_PHRASES';
  RAISE NOTICE 'Description: Comma-separated list of phrases that block auto-response';
  RAISE NOTICE 'Example: unsubscribe,do not reply,stop';
  RAISE NOTICE '';
END $$;

-- ===========================================
-- FUNCTION-SPECIFIC VARIABLES
-- ===========================================

-- Edge Function: openphone-run
-- Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENPHONE_API_KEY, PERPLEXITY_API_KEY
-- Optional: MAX_CONVERSATIONS_PER_RUN, RESPONSE_BLOCKLIST_PHONES, RESPONSE_BLOCKLIST_PHRASES

-- Edge Function: openphone-send-approved
-- Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENPHONE_API_KEY

-- Edge Function: ai-analyze
-- Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PERPLEXITY_API_KEY

-- Edge Function: gmail-triage
-- Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PERPLEXITY_API_KEY
-- Note: Gmail integration also requires OAuth tokens stored in gmail_accounts table

-- Edge Functions: stats, search, notifications, bulk-actions, openphone-runs, openphone-summaries,
--                 openphone-drafts, openphone-approve, openphone-reject, gmail-activity
-- Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

-- ===========================================
-- SETUP INSTRUCTIONS
-- ===========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'SETUP INSTRUCTIONS';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To set these environment variables, use one of these methods:';
  RAISE NOTICE '';
  RAISE NOTICE 'METHOD 1: Supabase Dashboard (Recommended for production)';
  RAISE NOTICE '1. Go to https://supabase.com/dashboard';
  RAISE NOTICE '2. Select your project';
  RAISE NOTICE '3. Navigate to Edge Functions in the left sidebar';
  RAISE NOTICE '4. Click the Settings (gear) icon';
  RAISE NOTICE '5. Add each environment variable with its value';
  RAISE NOTICE '6. Click Save';
  RAISE NOTICE '';
  RAISE NOTICE 'METHOD 2: Supabase CLI';
  RAISE NOTICE '1. Install Supabase CLI: https://supabase.com/docs/reference/cli';
  RAISE NOTICE '2. Login: supabase login';
  RAISE NOTICE '3. Link to project: supabase link --project-ref YOUR_PROJECT_REF';
  RAISE NOTICE '4. Set variables:';
  RAISE NOTICE '   supabase secrets set SUPABASE_URL="https://your-project.supabase.co"';
  RAISE NOTICE '   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"';
  RAISE NOTICE '   supabase secrets set OPENPHONE_API_KEY="your-openphone-api-key"';
  RAISE NOTICE '   supabase secrets set PERPLEXITY_API_KEY="your-perplexity-api-key"';
  RAISE NOTICE '   supabase secrets set GOOGLE_CLIENT_ID="your-google-client-id"';
  RAISE NOTICE '   supabase secrets set GOOGLE_CLIENT_SECRET="your-google-client-secret"';
  RAISE NOTICE '';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE 'After setting up, verify by calling any Edge Function:';
  RAISE NOTICE 'curl -X GET https://YOUR_PROJECT_REF.supabase.co/functions/v1/stats';
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'END OF SETUP SCRIPT';
  RAISE NOTICE '===========================================';
END $$;