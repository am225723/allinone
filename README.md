# Unified Communications Dashboard

A unified communications dashboard that provides full access to both **Quo/OpenPhone** SMS conversations and **Gmail** email communications within a single, modern interface.

![Dashboard Preview](./docs/dashboard-preview.png)

## Features

### OpenPhone (SMS/Voice)
- **Run Cleanup**: Process conversations within a date range
- **AI Summaries**: Automatically generate conversation summaries
- **Draft Replies**: AI-generated draft responses for review
- **Review Queue**: Approve, reject, or edit drafts before sending
- **Suppressions**: Block specific phones, conversations, or phrases
- **Contact Updates**: Infer and update unknown contact names

### Gmail
- **Email Triage**: Automatically analyze and prioritize emails
- **Draft Creation**: AI-generated reply drafts saved to Gmail
- **Skip Rules**: Configure rules to skip certain senders or subjects
- **Multi-Account**: Support for multiple Gmail accounts
- **Activity Log**: Track all processed emails and their status

### Unified Dashboard
- **Single View**: See all communications across channels
- **Real-time Stats**: Monitor response rates and pending items
- **Modern UI**: Dark theme with glassmorphism design
- **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Perplexity API (Sonar models for intelligent analysis)
- **APIs**: OpenPhone API, Gmail API (OAuth2)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenPhone API key
- Google Cloud project with Gmail API enabled
- Perplexity API key (sign up at https://www.perplexity.ai/)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/unified-communications-dashboard.git
cd unified-communications-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`

5. Set up the database schema in Supabase (see `supabase/schema.sql`)

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

The application uses the following main tables:

### OpenPhone Tables
- `runs` - Cleanup run records
- `summaries` - Conversation summaries
- `draft_replies` - Draft SMS replies
- `suppressions` - Blocked phones/phrases
- `contact_update_suggestions` - Inferred contact names
- `contact_map` - Phone to contact mapping
- `resolved_contacts` - Manually resolved contacts

### Gmail Tables
- `gmail_accounts` - Connected Gmail accounts
- `email_logs` - Processed email records
- `agent_rules` - Skip rules for triage
- `agent_settings` - Per-account settings

## Project Structure

```
unified-dashboard/
├── app/
│   ├── api/
│   │   ├── openphone/     # OpenPhone API routes
│   │   └── gmail/         # Gmail API routes
│   ├── openphone/         # OpenPhone pages
│   ├── gmail/             # Gmail pages
│   ├── settings/          # Settings page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard home
│   └── globals.css        # Global styles
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── openphone.ts       # OpenPhone API client
│   ├── gmail.ts           # Gmail API client
│   └── ai.ts              # AI services
├── components/            # Reusable components
└── public/                # Static assets
```

## API Routes

### OpenPhone
- `POST /api/openphone/run` - Start a cleanup run
- `GET /api/openphone/drafts` - List draft replies
- `POST /api/openphone/approve` - Approve a draft
- `POST /api/openphone/reject` - Reject a draft
- `POST /api/openphone/send-approved` - Send all approved drafts
- `GET /api/openphone/summaries` - List summaries
- `GET /api/openphone/runs` - List run history

### Gmail
- `POST /api/gmail/triage` - Run email triage
- `GET /api/gmail/activity` - List processed emails
- `GET /api/gmail/auth` - Start OAuth flow
- `GET /api/gmail/auth/callback` - OAuth callback

## Configuration

### OpenPhone Settings
- **MAX_CONVERSATIONS_PER_RUN**: Limit conversations per run (default: 25)
- **RESPONSE_BLOCKLIST_PHONES**: Comma-separated phone numbers to block
- **RESPONSE_BLOCKLIST_PHRASES**: Comma-separated phrases to block

### Gmail Settings
- **DEFAULT_LOOKBACK_DAYS**: Days to scan for emails (default: 14)
- **CUSTOM_SIGNATURE_HTML**: Custom email signature

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team or open an issue in the repository.