# Unified Communications Dashboard

## Overview
A unified communications dashboard for managing Quo/OpenPhone and Gmail integrations. Built with Next.js 14, Supabase, and AI services (Perplexity API).

## Project Structure
- `app/` - Next.js App Router pages and API routes
- `app/api/` - API routes (most configured for Edge Runtime on Vercel)
- `components/` - React components
- `lib/` - Utility libraries and services
- `supabase/` - Supabase configuration, migrations, and Edge Functions

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **APIs**: OpenPhone, Gmail (Google OAuth), Perplexity AI
- **Deployment**: Vercel (Edge Functions enabled)

## Edge Functions Configuration

### Vercel Edge Runtime (Next.js API Routes)
The following API routes are configured with `export const runtime = 'edge'` for faster cold starts on Vercel:

| Route | Description | Edge Enabled |
|-------|-------------|--------------|
| `/api/stats` | Dashboard statistics | Yes |
| `/api/search` | Unified search | Yes |
| `/api/notifications` | Notification management | Yes |
| `/api/bulk-actions` | Bulk operations | Yes |
| `/api/ai/analyze` | AI analysis (Perplexity) | Yes |
| `/api/openphone/run` | OpenPhone cleanup runs | Yes |
| `/api/openphone/runs` | List runs | Yes |
| `/api/openphone/drafts` | Get draft replies | Yes |
| `/api/openphone/summaries` | Get summaries | Yes |
| `/api/openphone/approve` | Approve drafts | Yes |
| `/api/openphone/reject` | Reject drafts | Yes |
| `/api/openphone/send-approved` | Send approved drafts | Yes |
| `/api/gmail/activity` | Gmail activity logs | Yes |
| `/api/gmail/triage` | Gmail triage (uses googleapis) | No (Node.js) |

### Supabase Edge Functions
14 Supabase Edge Functions are available in `supabase/functions/` for alternative deployment:
- See `EDGE_FUNCTIONS_GUIDE.md` for deployment instructions

## Environment Variables

### Required (Vercel/Supabase Secrets)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENPHONE_API_KEY=your-openphone-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain/api/gmail/auth/callback
```

### Optional
```
MAX_CONVERSATIONS_PER_RUN=25
RESPONSE_BLOCKLIST_PHONES=+15551234567,+15559876543
RESPONSE_BLOCKLIST_PHRASES=unsubscribe,do not reply
CUSTOM_SIGNATURE_HTML=<p>Best regards,<br>Your Name</p>
```

## Development
- Server runs on port 5000
- Uses `npm run dev` for development
- Edge functions work locally in development mode

## Database Schema
Run `supabase/complete_schema.sql` to set up all required tables:
- `runs` - OpenPhone cleanup run tracking
- `summaries` - Conversation summaries
- `draft_replies` - Draft message replies
- `notifications` - In-app notifications
- `email_logs` - Gmail processing logs
- `gmail_accounts` - Connected Gmail accounts
- `agent_rules` - Triage rules
- `suppressions` - Phone/phrase blocklists
- `contact_map` / `contact_update_suggestions` - Contact management

## Recent Changes
- 2026-01-30: Added Edge Runtime to 13 API routes for Vercel deployment
- 2026-01-30: Initial Replit setup - configured for port 5000 with proxy support
