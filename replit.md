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
- **Authentication:** Animated `/login` page with PIN-based authentication.
- **PWA Support:** Enhanced Progressive Web App features for Apple/iOS devices, including offline support, install to home screen, and push notifications.

### Technical Implementations
- **Framework:** Next.js 14 with the App Router.
- **Styling:** Tailwind CSS for a utility-first approach to styling.
- **Backend:** Primarily Supabase Edge Functions (Deno) for API operations, with Next.js API routes as a fallback.
- **State Management:** React Context API or similar for global state.
- **Authentication:** Custom PIN-based authentication system with user management features.
- **Cron Jobs:** Vercel Cron jobs for scheduled tasks like daily cleanups, Gmail triage, and summary generation.
- **Push Notifications:** OneSignal integration for urgent alerts, draft notifications, and daily summaries.
- **Data Export:** Supports CSV, JSON, and HTML formats for various data types (summaries, drafts, emails, activity, daily_summary).

### Feature Specifications
- **OpenPhone/Quo Integration:** SMS/Voice conversation management, AI-powered summaries, draft replies, bulk actions (approve, reject, archive), and scheduled cleanup.
- **Gmail Integration:** Email triage with AI, scheduled triage, account management, and rule-based processing.
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
- **Database Schema:** Structured PostgreSQL database via Supabase, with tables for tracking runs, summaries, drafts, notifications, email logs, accounts, agent rules, suppressions, tasks, push devices, message templates, daily summaries, app settings, users, and clinical notes.
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