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
- **APIs**: OpenPhone, Gmail (Google OAuth), Perplexity AI, OneSignal (Push)
- **Deployment**: Vercel (Edge Functions + Cron Jobs enabled)

## Features

### Core Features
- OpenPhone SMS/Voice conversation management
- Gmail email triage with AI
- AI-powered draft responses (Perplexity)
- Unified search across channels
- Bulk actions (approve, reject, archive)

### New Features (2026-01-30)
1. **Scheduled Automation** - Vercel Cron jobs for:
   - Daily OpenPhone cleanup (6 AM UTC)
   - Gmail triage every 4 hours
   - Daily summary generation (8 AM UTC)

2. **Push Notifications** - OneSignal integration for:
   - Urgent message alerts
   - Draft ready notifications
   - Daily summaries

3. **Message Templates** - Saved response templates with:
   - Variable substitution ({{name}}, {{date}}, etc.)
   - Categories (greeting, appointment, follow-up, etc.)
   - Usage tracking

4. **Export/Reporting** - Multiple formats:
   - **CSV**: Machine-readable spreadsheet format
   - **JSON**: Structured data for integrations
   - **HTML**: Print-ready format (use browser's "Print to PDF" for PDF files)
   - Supports: summaries, drafts, emails, activity, daily_summary

## API Routes

### Core Routes (Edge Runtime)
| Route | Description |
|-------|-------------|
| `/api/stats` | Dashboard statistics |
| `/api/search` | Unified search |
| `/api/notifications` | Notification management |
| `/api/bulk-actions` | Bulk operations |
| `/api/ai/analyze` | AI analysis |
| `/api/openphone/*` | OpenPhone operations |
| `/api/gmail/activity` | Gmail activity logs |
| `/api/gmail/triage` | Gmail triage (Node.js) |

### New Feature Routes
| Route | Description |
|-------|-------------|
| `/api/cron/openphone-cleanup` | Scheduled OpenPhone cleanup |
| `/api/cron/gmail-triage` | Scheduled Gmail triage |
| `/api/cron/daily-summary` | Daily summary generation |
| `/api/push/register` | Register push device (server-to-server) |
| `/api/push/send` | Send push notification (authenticated) |
| `/api/templates` | Message templates CRUD |
| `/api/templates/[id]` | Template by ID |
| `/api/export` | Data export (CSV/JSON/HTML) |

## Environment Variables

### Required
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENPHONE_API_KEY=your-openphone-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain/api/gmail/auth/callback
```

### New Feature Variables
```
# Admin Authentication
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_EMAILS=admin@example.com,another@example.com

# OneSignal Push Notifications
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-onesignal-rest-api-key

# Cron Job Security
CRON_SECRET=your-random-secret-for-cron-auth

# App URL (for internal API calls)
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

### Optional
```
MAX_CONVERSATIONS_PER_RUN=25
RESPONSE_BLOCKLIST_PHONES=+15551234567,+15559876543
RESPONSE_BLOCKLIST_PHRASES=unsubscribe,do not reply
CUSTOM_SIGNATURE_HTML=<p>Best regards,<br>Your Name</p>
```

## Database Schema

### Existing Tables
- `runs` - OpenPhone cleanup run tracking
- `summaries` - Conversation summaries
- `draft_replies` - Draft message replies
- `notifications` - In-app notifications
- `email_logs` - Gmail processing logs
- `gmail_accounts` - Connected Gmail accounts
- `agent_rules` - Triage rules
- `suppressions` - Phone/phrase blocklists
- `tasks` - Task management with status, priority, checklists
- `tasks_history` - Task audit log

### New Tables (run `supabase/migrations/002_new_features.sql`)
- `push_devices` - Push notification device registrations
- `message_templates` - Saved message templates
- `daily_summaries` - Daily stats for reporting

## Vercel Cron Jobs

Configured in `vercel.json`:
- `0 6 * * *` - OpenPhone cleanup (daily at 6 AM UTC)
- `0 */4 * * *` - Gmail triage (every 4 hours)
- `0 8 * * *` - Daily summary (daily at 8 AM UTC)

## Export API Usage

```bash
# Export summaries as CSV
GET /api/export?type=summaries&format=csv

# Export emails as JSON with date range
GET /api/export?type=emails&format=json&startDate=2026-01-01&endDate=2026-01-31

# Export activity as printable HTML (use browser "Print to PDF" for PDF files)
GET /api/export?type=activity&format=html

# Export types: summaries, drafts, emails, activity, daily_summary
# Formats: csv, json, html (print-to-PDF)
```

## Push Notifications

Push notification endpoints require authentication:
- `/api/push/register` - Server-to-server only. Requires `x-api-key: PUSH_API_SECRET` header.
- `/api/push/send` - Requires `Authorization: Bearer CRON_SECRET` or `x-api-key: PUSH_API_SECRET`.

**Recommended flow for mobile apps:**
1. Mobile app gets OneSignal player ID from SDK
2. App sends player ID to your backend
3. Backend calls `/api/push/register` with PUSH_API_SECRET

## Development
- Server runs on port 5000
- Uses `npm run dev` for development
- Edge functions work locally in development mode

## Recent Changes
- 2026-01-30: Added Task Management Module with List/Kanban views, AI features
- 2026-01-30: Added admin authentication with password protection
- 2026-01-30: Converted to PWA with OneSignal web SDK
- 2026-01-30: Added Admin Panel for notifications, templates, exports
- 2026-01-30: Added scheduled automation (Vercel Cron)
- 2026-01-30: Added OneSignal push notification integration
- 2026-01-30: Added message templates feature
- 2026-01-30: Added export/reporting (CSV/JSON/HTML for PDF)
- 2026-01-30: Added Edge Runtime to 13 API routes
- 2026-01-30: Initial Replit setup

## PWA Features

This app is a Progressive Web App (PWA) with:
- **Offline support** via service worker caching
- **Install to home screen** on mobile and desktop
- **Push notifications** via OneSignal web SDK

### OneSignal Configuration
- App ID: `a826fa27-5eaf-46ef-8a58-118e8dd2820c`
- SDK initialized automatically on page load
- Users will be prompted to allow notifications

### PWA Files
- `/public/manifest.json` - Web app manifest
- `/public/sw.js` - Service worker for offline caching
- `/public/icons/` - App icons in various sizes
- `/components/OneSignalInit.tsx` - OneSignal SDK initialization
- `/components/ServiceWorkerRegistration.tsx` - Service worker registration
