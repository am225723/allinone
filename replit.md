# Unified Communications Dashboard

## Overview
The Unified Communications Dashboard is a Next.js 14 application designed to streamline communication management for businesses. It integrates OpenPhone (renamed to Quo) and Gmail, leveraging Supabase for the backend and AI services for enhanced functionalities. The project aims to provide a centralized platform for managing conversations, triaging emails, and automating communication tasks, ultimately improving efficiency and responsiveness. Key capabilities include AI-powered draft responses, unified search, scheduled automations, push notifications, and comprehensive reporting. The long-term vision is to establish a robust, AI-augmented communication hub for businesses, potentially expanding to integrate with other communication channels and offering advanced analytics.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `supabase/functions/`.
Do not make changes to the file `supabase/functions/cron-openphone-cleanup.ts`.

## System Architecture

### UI/UX Decisions
The dashboard features a modern, intuitive design with a focus on usability. Key UI/UX elements include:
- **Navigation:** Desktop sidebar and mobile bottom navigation, with colorful accents (blue, emerald, orange, red, violet, cyan) and glow effects for dashboard cards.
- **Dashboard Layout:** A 2x2 grid of stat cards displaying key metrics (e.g., Appointments Today, Tasks Today, Emails/Messages/Calls), a dedicated task section, and unified feeds for Quo and Gmail.
- **Clinical Dashboard:** A specialized `/patients` page adopting a Clinical Dashboard layout with stat cards (Appointments, Pending Notes, Weekly, Revenue), a daily agenda timeline with color-coded appointment blocks (blue for telehealth, red for intake), and an appointment details panel.
- **Clinical Note Generator (`/noteai`):** A 3-column layout integrating template selection, file upload with transcription tracking, generation settings (tone, detail, section toggles), and a "Clinical Copilot" panel for pre-flight checks, follow-up questions, session snapshots, completeness tracking, and risk assessment. It also includes diagnosis suggestions with ICD-10 codes and confidence levels, and a letterhead matching an official template.
- **Authentication:** Animated `/login` page with PIN-based authentication and WebAuthn biometric login (Face ID, Touch ID, Windows Hello).
- **PWA Support:** Enhanced Progressive Web App features for Apple/iOS devices, including offline support, install to home screen, and push notifications.

### Technical Implementations
- **Framework:** Next.js 14 with the App Router.
- **Styling:** Tailwind CSS for a utility-first approach to styling.
- **Backend:** Primarily Supabase Edge Functions (Deno) for API operations, with Next.js API routes as a fallback.
- **State Management:** React Context API or similar for global state.
- **Authentication:** Custom PIN-based authentication with WebAuthn biometric support (Face ID, Touch ID, Windows Hello). Challenges stored in database for serverless compatibility.
- **Cron Jobs:** Vercel Cron jobs for scheduled tasks like daily cleanups, Gmail triage, and summary generation.
- **Push Notifications:** OneSignal integration for urgent alerts, draft notifications, and daily summaries.
- **Data Export:** Supports CSV, JSON, and HTML formats for various data types (summaries, drafts, emails, activity, daily_summary).

### Feature Specifications
- **Client Database:** Single-tenant client management with CRUD operations, multi-contact support (phones/emails), CSV import/export, identity matching for Quo/Gmail, and unmatched contacts inbox workflow.
- **OpenPhone/Quo Integration:** SMS/Voice conversation management, AI-powered summaries, draft replies, bulk actions (approve, reject, archive), scheduled cleanup, and client identity matching.
- **Gmail Integration:** Email triage with AI, scheduled triage, account management, rule-based processing, and client identity matching.
- **AI Services:** Perplexity AI for draft responses, analysis, and clinical note generation.
- **Message Templates:** Saved response templates with variable substitution, categorization, and usage tracking.
- **Task Management:** List and Kanban views for tasks, with status, priority, checklists, and AI features for subtask suggestions.
- **Clinical Notes Module:** Comprehensive system for generating clinical notes, including templates, AI prompt management, file uploads with transcription, version history, and export options.
- **User Management:** Admin panel for creating/deleting users and managing PINs.
- **Settings:** Sub-pages for profile, notifications, integrations, and security.

### System Design Choices
- **Edge Computing:** Extensive use of Vercel Edge Functions and Supabase Edge Functions for performance and scalability, ensuring API routes are fast and globally distributed.
- **Serverless Architecture:** Leveraging Supabase for database and authentication, combined with Vercel for frontend deployment and cron jobs, minimizes operational overhead.
- **Modular Design:** Clear separation of concerns with `app/`, `components/`, `lib/`, and `supabase/` directories for maintainability and scalability.
- **Database Schema:** Structured PostgreSQL database via Supabase, with tables for tracking runs, summaries, drafts, notifications, email logs, accounts, agent rules, suppressions, tasks, push devices, message templates, daily summaries, app settings, users, clinical notes, clients, client_contacts, inbound_identity_events, client_import_jobs, webauthn_credentials, and webauthn_challenges.
- **Security:** Environment variables for sensitive keys, admin password protection, and `CRON_SECRET` for cron job authentication.

## External Dependencies

- **Database:** Supabase (PostgreSQL)
- **Framework:** Next.js 14
- **Styling:** Tailwind CSS
- **Communication APIs:**
    - OpenPhone (Quo) API
    - Gmail API (Google OAuth)
- **AI Services:** Perplexity AI
- **Push Notifications:** OneSignal (for web and mobile push)
- **Deployment:** Vercel (for hosting, Edge Functions, and Cron Jobs)

## Recent Changes
- 2026-02-05: Added WebAuthn biometric authentication (Face ID, Touch ID, Windows Hello) with database-backed challenge storage
- 2026-02-05: Created BiometricEnrollment prompt after PIN login and BiometricSettings component in Security settings
- 2026-02-08: Quo page now fetches real stats from /api/stats and real summaries from /api/openphone/summaries (no hardcoded data)
- 2026-02-08: Patient-stats API fetches calendar URLs from app_settings, parses ICS files, computes real appointment counts and next appointment
- 2026-02-08: Created calendar URL management API (app/api/calendar/urls/) - GET/POST for storing calendar URLs in app_settings
- 2026-02-08: Created Gmail OAuth callback route (app/api/gmail/auth/callback/) for multi-account token exchange
- 2026-02-08: Quo run auto-redirects to summaries page after completion
- 2026-02-08: Rewrote summaries page with inline draft approve/reject and suppression management UI
- 2026-02-08: Added suppression add/remove actions to OpenPhone settings API
- 2026-02-08: Homepage shows next appointment card from calendar data
- 2026-02-08: Created note templates PUT/DELETE endpoints (app/api/notes/templates/[id]/)
- 2026-02-05: Added Light Mode support with theme toggle in sidebar, CSS variables for both themes, localStorage persistence
- 2026-02-05: Fixed Perplexity API error by removing unsupported response_format parameter
- 2026-02-05: Fixed PinGuard auth check to use API instead of httpOnly cookie reading
- 2026-02-04: Security fix - Removed service role key exposure from browser code, migrated to Next.js API routes
- 2026-02-04: Created 11 Next.js API routes for client operations (app/api/clients/, app/api/clients/inbox/, app/api/integrations/)
- 2026-02-04: Updated lib/supabase-functions.ts with new function-to-route mappings
- 2026-02-04: Implemented Client Database feature with full CRUD, multi-contact support, CSV import/export
- 2026-02-04: Added 16 Supabase Edge Functions for client management (clients-list, clients-create, clients-get, clients-update, clients-status, contacts-add, contacts-update, contacts-delete, inbox-list, inbox-link, inbox-create-client, inbox-ignore, integrations-quo-inbound, integrations-gmail-inbound, clients-import, clients-export)
- 2026-02-04: Created /clients page with Clients tab and Inbox tab for unmatched contacts
- 2026-02-04: Created /clients/[id] detail page with demographics, contacts, insurance, and notes tabs
- 2026-02-04: Added ClientMatchBanner component for Quo/Gmail identity matching integration
- 2026-02-04: Added "Clients" to sidebar and bottom navigation
- 2026-02-03: Added "Note AI" link in sidebar navigation (standalone, not attached to client)
- 2026-02-03: Added manual patient linking with search dropdown when no appointment selected
- 2026-02-03: Added Template creation in Template Settings (custom templates with sections)
- 2026-02-03: Added Google Drive file import in Session Inputs (alongside local upload)
- 2026-02-13: Enhanced Gmail accounts page with per-account settings (draft toggle, signature mode, triage priority, max drafts, reply prefix, auto-label)
- 2026-02-13: Created Gmail account settings API (app/api/gmail/accounts/settings/) for per-account preference storage
- 2026-02-13: Gmail triage now respects per-account settings: draftsEnabled, signatureMode, autoLabel, triagePriority (all/important_only/none), maxDraftsPerRun
- 2026-02-13: Created dedicated Calendar Settings page (/settings/calendars) with multi-calendar management, reordering, editing, and help text
- 2026-02-13: Month view now shows event times (e.g. "9a", "2:30p") alongside colored dots instead of just dots
- 2026-02-13: Added Practice section to Settings page with Appointment Types and Calendars links
- 2026-02-12: Fixed Gmail rules API - column mapping (rule_type/is_enabled/gmail_account_id) now matches agent_rules table schema
- 2026-02-12: Added domain-level skip rules (skip_domain) for Gmail triage alongside existing sender/subject rules
- 2026-02-12: Created unified skip/suppression rules page (/gmail/rules) with tabs for Gmail rules and SMS suppressions
- 2026-02-12: Redesigned calendar management with named calendars, custom colors, enable/disable toggles, and auto-save
- 2026-02-12: Calendar API now returns CalendarEntry objects {url, name, color, enabled}, backwards compatible with old string arrays
- 2026-02-12: Calendar events show source calendar name and use calendar color for event blocks and month view dots
- 2026-02-12: Calendar legend appears in month view when multiple calendars are connected
- 2026-02-03: Added "Save to Patient Folder" button that exports PDF to correct patient folder on Google Drive
- 2026-02-10: Fixed Gmail OAuth redirect_uri mismatch - created /api/auth/google-callback route matching Google Cloud Console registration
- 2026-02-10: Set GOOGLE_REDIRECT_URI env var to https://agent.drz.services/api/auth/google-callback
- 2026-02-10: Removed all mock/hardcoded demo data from Patients page - now auto-loads real calendar events from saved URLs
- 2026-02-10: Fixed WebAuthn biometric registration 500 error - updated userID encoding for @simplewebauthn v13 (TextEncoder instead of Buffer)
- 2026-02-10: Updated push notification endpoint to accept cookie-based admin/PIN session auth (no API key needed from admin panel)
- 2026-02-10: Wired push notifications into cron jobs: daily-summary sends daily summary push, note-reminders sends missing notes push, gmail-triage sends drafts-ready push
- 2026-02-10: Admin panel notification form now uses session auth instead of NEXT_PUBLIC_PUSH_API_SECRET
- 2026-02-03: Redesigned /noteai page - merged Template + Prompt Profile into single Template

## Client Database

### How to Add Clients
1. Navigate to `/clients` in the sidebar
2. Click "Add Client" button
3. Fill in first name, last name (required), and optional fields (preferred name, DOB, MRN, phone, email)
4. Click "Create Client"

### How to Import/Export CSV
**Import:**
1. Click "Import" button on /clients page
2. Download the template CSV for reference
3. Upload your CSV file
4. Preview the data and optionally enable "Update matches by MRN"
5. Click "Import Clients"

**Export:**
1. Click "Export" button on /clients page
2. CSV file will download with all client data

**CSV Template Headers:**
`firstName,lastName,preferredName,dob,mrn,status,phone,phoneLabel,phone2,phone2Label,email,emailLabel,email2,email2Label,addressLine1,addressLine2,city,state,zip,insuranceProvider,insuranceMemberId,emergencyContactName,emergencyContactPhone`

### How Quo/Gmail Matching Works
1. When a phone/email appears in Quo or Gmail, the system calls the integration endpoint
2. If the phone/email matches a client_contact, it returns the matched client
3. If no match, an inbound_identity_event is created with status "new"
4. Unmatched contacts appear in the Inbox tab under /clients
5. From the Inbox, you can:
   - **Link**: Associate the identity with an existing client
   - **Create**: Create a new client from the identity
   - **Ignore**: Dismiss the identity event

### Inbox Linking Workflow
1. Go to `/clients` and click the "Inbox" tab
2. Filter by source (All, Quo, Gmail)
3. For each unmatched contact:
   - Click "Link" to search and select an existing client
   - Click "Create" to create a new client with the contact pre-filled
   - Click "Ignore" to dismiss
4. Linked identities become client_contacts and can be used for future matching