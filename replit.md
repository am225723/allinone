# Unified Communications Dashboard

## Overview
The Unified Communications Dashboard is a Next.js 14 application designed to streamline communication management for businesses. It integrates OpenPhone (Quo) and Gmail, leveraging Supabase for the backend and AI services for enhanced functionalities. The project aims to provide a centralized platform for managing conversations, triaging emails, and automating communication tasks, ultimately improving efficiency and responsiveness. Key capabilities include AI-powered draft responses, unified search, scheduled automations, push notifications, and comprehensive reporting. The long-term vision is to establish a robust, AI-augmented communication hub for businesses, potentially expanding to integrate with other communication channels and offering advanced analytics.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `supabase/functions/`.
Do not make changes to the file `supabase/functions/cron-openphone-cleanup.ts`.

## System Architecture

### UI/UX Decisions
The dashboard features a modern, intuitive design with a focus on usability. Key UI/UX elements include:
- **Navigation:** Desktop sidebar and mobile bottom navigation with colorful accents and glow effects.
- **Dashboard Layout:** A 2x2 grid of stat cards, a dedicated task section, and unified feeds for Quo and Gmail.
- **Clinical Dashboard:** A specialized `/patients` page with stat cards, a daily agenda timeline with color-coded appointment blocks, and an appointment details panel.
- **Clinical Note Generator (`/noteai`):** A 3-column layout integrating template selection, file upload with transcription tracking, generation settings, and a "Clinical Copilot" panel for pre-flight checks, follow-up questions, session snapshots, completeness tracking, risk assessment, and diagnosis suggestions with ICD-10 codes. It also includes letterhead matching.
- **Authentication:** Animated `/login` page with PIN-based authentication and WebAuthn biometric login (Face ID, Touch ID, Windows Hello).
- **PWA Support:** Enhanced Progressive Web App features for Apple/iOS devices, including offline support, install to home screen, and push notifications.

### Technical Implementations
- **Framework:** Next.js 14 with the App Router.
- **Styling:** Tailwind CSS for a utility-first approach.
- **Backend:** Primarily Supabase Edge Functions (Deno) for API operations, with Next.js API routes as a fallback.
- **State Management:** React Context API or similar for global state.
- **Authentication:** Custom PIN-based authentication with WebAuthn biometric support.
- **Cron Jobs:** Vercel Cron jobs for scheduled tasks.
- **Push Notifications:** OneSignal integration.
- **Data Export:** Supports CSV, JSON, and HTML formats.

### Feature Specifications
- **Client Database:** Single-tenant client management with CRUD, multi-contact support, CSV import/export, identity matching for Quo/Gmail, and unmatched contacts inbox workflow.
- **OpenPhone/Quo Integration:** SMS/Voice conversation management, AI-powered summaries, draft replies, bulk actions, scheduled cleanup, and client identity matching.
- **Gmail Integration:** Email triage with AI, scheduled triage, account management, rule-based processing, and client identity matching.
- **AI Services:** Perplexity AI for draft responses, analysis, and clinical note generation.
- **Message Templates:** Saved response templates with variable substitution, categorization, and usage tracking.
- **Task Management:** List and Kanban views with status, priority, checklists, and AI features for subtask suggestions.
- **Clinical Notes Module:** Comprehensive system for generating clinical notes, including templates, AI prompt management, file uploads with transcription, version history, and export options.
- **User Management:** Admin panel for creating/deleting users and managing PINs.
- **Settings:** Sub-pages for profile, notifications, integrations, and security.

### System Design Choices
- **Edge Computing:** Extensive use of Vercel Edge Functions and Supabase Edge Functions for performance and scalability.
- **Serverless Architecture:** Leveraging Supabase for database and authentication, combined with Vercel for frontend deployment and cron jobs.
- **Modular Design:** Clear separation of concerns with `app/`, `components/`, `lib/`, and `supabase/` directories.
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
- **Push Notifications:** OneSignal
- **Deployment:** Vercel (for hosting, Edge Functions, and Cron Jobs)