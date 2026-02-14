# Edge Functions Migration Guide

## Overview
This guide covers migrating all Next.js API routes to Supabase Edge Functions for better performance, scalability, and cost-efficiency.

## Why Edge Functions?

### Benefits over Next.js API Routes:
1. **Faster Cold Starts**: Deno runtime starts in milliseconds vs Node.js seconds
2. **Global Edge Deployment**: Functions run closer to users worldwide
3. **Lower Costs**: Pay only for execution time, not for server uptime
4. **Built-in Caching**: Automatic caching for repeated requests
5. **Automatic HTTPS**: No SSL certificate management needed
6. **Simpler Deployment**: Single command deployment vs full Next.js builds
7. **TypeScript Support**: Native TypeScript support out of the box

### Performance Comparison:
- **Next.js API Route**: ~2-5 seconds cold start
- **Supabase Edge Function**: ~50-200ms cold start
- **Improvement**: 10-100x faster cold starts

---

## Edge Functions Created

### 1. Statistics & Dashboard
- **stats**: Dashboard statistics, trends, and activity feed

### 2. Search
- **search**: Unified search across OpenPhone and Gmail with smart filters

### 3. Notifications
- **notifications**: In-app and push notifications management

### 4. Bulk Operations
- **bulk-actions**: Bulk approve, reject, delete, and archive operations

### 5. AI Features
- **ai-analyze**: Sentiment analysis, topic extraction, draft generation (powered by Perplexity AI)

### 6. OpenPhone Operations
- **openphone-run**: Execute OpenPhone conversation cleanup runs
- **openphone-runs**: List all cleanup runs
- **openphone-summaries**: Get conversation summaries
- **openphone-drafts**: Get draft replies
- **openphone-approve**: Approve draft replies
- **openphone-reject**: Reject draft replies
- **openphone-send-approved**: Send all approved drafts via OpenPhone API

### 7. Gmail Operations
- **gmail-triage**: Automated email triage with AI analysis
- **gmail-activity**: Get Gmail email logs

**Total: 14 Edge Functions**

---

## Prerequisites

### 1. Supabase CLI Installation
```bash
# macOS
brew install supabase/tap/supabase

# Linux
curl -fsSL https://supabase.com/install.sh | bash

# Windows
winget install Supabase.SupabaseCLI
```

### 2. Link to Your Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Set Environment Variables
See `supabase/setup_environment_variables.sql` for the complete list.

---

## Deployment Steps

### Step 1: Set Up Database Schema

Run the complete schema SQL file:
```bash
# Via Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Open supabase/complete_schema.sql
4. Run the script

# Via CLI
supabase db push
```

### Step 2: Configure Environment Variables

**Option A: Supabase Dashboard (Recommended)**
```
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Edge Functions
4. Click Settings (gear icon)
5. Add each environment variable:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - OPENPHONE_API_KEY
   - PERPLEXITY_API_KEY
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - MAX_CONVERSATIONS_PER_RUN (optional, default: 25)
   - RESPONSE_BLOCKLIST_PHONES (optional)
   - RESPONSE_BLOCKLIST_PHRASES (optional)
```

**Option B: Supabase CLI**
```bash
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
supabase secrets set OPENPHONE_API_KEY="your-openphone-api-key"
supabase secrets set PERPLEXITY_API_KEY="your-perplexity-api-key"
supabase secrets set GOOGLE_CLIENT_ID="your-google-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Step 3: Deploy Edge Functions

Deploy all Edge Functions:
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy stats
supabase functions deploy search
# ... deploy each function individually if needed
```

### Step 4: Test Edge Functions

Test each function:
```bash
# Test stats
curl -X GET https://YOUR_PROJECT_REF.supabase.co/functions/v1/stats

# Test search
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'

# Test notifications
curl -X GET https://YOUR_PROJECT_REF.supabase.co/functions/v1/notifications

# Test bulk actions
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/bulk-actions \
  -H "Content-Type: application/json" \
  -d '{"action": "approve", "ids": ["uuid1", "uuid2"]}'

# Test AI analysis
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-analyze \
  -H "Content-Type: application/json" \
  -d '{"action": "sentiment", "text": "Hello world"}'
```

---

## API Endpoint Changes

### Next.js API Routes (Old):
```
GET  /api/stats
POST /api/search
GET  /api/notifications
POST /api/bulk-actions
POST /api/ai/analyze
POST /api/openphone/run
GET  /api/openphone/runs
GET  /api/openphone/summaries
GET  /api/openphone/drafts
POST /api/openphone/approve
POST /api/openphone/reject
POST /api/openphone/send-approved
POST /api/gmail/triage
GET  /api/gmail/activity
```

### Edge Functions (New):
```
GET  /functions/v1/stats
POST /functions/v1/search
GET  /functions/v1/notifications
POST /functions/v1/bulk-actions
POST /functions/v1/ai-analyze
POST /functions/v1/openphone-run
GET  /functions/v1/openphone-runs
GET  /functions/v1/openphone-summaries
GET  /functions/v1/openphone-drafts
POST /functions/v1/openphone-approve
POST /functions/v1/openphone-reject
POST /functions/v1/openphone-send-approved
POST /functions/v1/gmail-triage
GET  /functions/v1/gmail-activity
```

### Update Client Code:

**Before:**
```typescript
const response = await fetch('/api/stats')
const data = await response.json()
```

**After:**
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stats`)
const data = await response.json()
```

**Or create a helper:**
```typescript
// lib/edge-functions.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function callEdgeFunction(name: string, options: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    }
  })
  return response.json()
}

// Usage
const data = await callEdgeFunction('stats')
const searchResults = await callEdgeFunction('search', {
  method: 'POST',
  body: JSON.stringify({ query: 'test' })
})
```

---

## Edge Function Details

### stats
**Purpose**: Dashboard statistics and metrics

**Endpoints**:
- `GET /functions/v1/stats?type=all` - Get all stats
- `GET /functions/v1/stats?type=activity&limit=10` - Get recent activity
- `GET /functions/v1/stats?type=trends&days=7` - Get trend data

**Response Example**:
```json
{
  "ok": true,
  "stats": {
    "totalCommunications": 150,
    "needsResponse": 25,
    "pendingDrafts": 10,
    "unprocessedEmails": 15,
    "avgResponseTime": 45,
    "activeToday": 8
  }
}
```

---

### search
**Purpose**: Unified search across OpenPhone and Gmail

**Endpoints**:
- `POST /functions/v1/search` - Search communications
- `GET /functions/v1/search?q=query` - Get search suggestions

**Request Example**:
```json
{
  "query": "urgent",
  "channel": "openphone",
  "priority": "high",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  }
}
```

---

### notifications
**Purpose**: Notification management

**Endpoints**:
- `GET /functions/v1/notifications` - Get all notifications
- `GET /functions/v1/notifications?type=unread` - Get unread notifications
- `GET /functions/v1/notifications?type=count` - Get unread count
- `POST /functions/v1/notifications` - Create or manage notifications

**Request Example**:
```json
{
  "action": "mark-read",
  "notificationId": "uuid"
}
```

---

### bulk-actions
**Purpose**: Bulk operations on multiple items

**Endpoints**:
- `POST /functions/v1/bulk-actions` - Execute bulk operations

**Actions**:
- `approve` - Approve multiple draft replies
- `reject` - Reject multiple draft replies
- `delete` - Delete multiple drafts
- `mark-processed` - Mark emails as processed
- `update-priority` - Update priority of emails
- `add-tags` - Add tags to emails
- `archive` - Archive conversations

**Request Example**:
```json
{
  "action": "approve",
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### ai-analyze
**Purpose**: AI-powered text analysis

**Endpoints**:
- `POST /functions/v1/ai-analyze` - Analyze text with AI

**Actions**:
- `sentiment` - Analyze sentiment and emotion
- `topics` - Extract topics and entities
- `follow-up` - Generate follow-up questions
- `draft-variations` - Generate draft reply variations

**Request Example**:
```json
{
  "action": "sentiment",
  "text": "I'm very happy with your service!",
  "context": {
    "tone": "professional"
  }
}
```

---

### openphone-run
**Purpose**: Execute OpenPhone conversation cleanup

**Endpoints**:
- `POST /functions/v1/openphone-run` - Run conversation cleanup

**Request Example**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "resumeRunId": "optional-uuid"
}
```

---

### openphone-send-approved
**Purpose**: Send all approved drafts via OpenPhone API

**Endpoints**:
- `POST /functions/v1/openphone-send-approved` - Send approved drafts

**Response Example**:
```json
{
  "ok": true,
  "sent": 5,
  "failed": 0,
  "errors": []
}
```

---

### gmail-triage
**Purpose**: Automated email triage with AI

**Endpoints**:
- `POST /functions/v1/gmail-triage` - Run email triage

**Request Example**:
```json
{
  "lookbackDays": 14
}
```

---

## Monitoring & Debugging

### View Function Logs
```bash
# View all logs
supabase functions logs

# View specific function logs
supabase functions logs stats
supabase functions logs openphone-run
```

### Test Locally
```bash
# Start local development server
supabase start

# Test function locally
curl -i http://localhost:54321/functions/v1/stats
```

---

## Cost Considerations

### Edge Functions Pricing:
- **Bandwidth**: $0.09/GB
- **Invocations**: $2 per million requests
- **Compute Time**: $0.10 per 1M GB-seconds

**Example Monthly Cost (10,000 requests, avg 500ms each)**:
- Invocations: $0.02 (10,000 / 1,000,000 * $2)
- Compute: $0.01 (10,000 * 0.5s / 1,000,000 * $0.10)
- Bandwidth: $0.01 (100MB / 1000 * $0.09)
- **Total**: ~$0.04/month

### Next.js API Routes (VPS Alternative):
- **VPS**: $5-20/month minimum
- Always running regardless of traffic
- Higher maintenance overhead

**Savings**: 100-500x cost reduction with Edge Functions

---

## Troubleshooting

### Issue: Function not found
**Solution**: Ensure function is deployed: `supabase functions deploy`

### Issue: Environment variables not loaded
**Solution**: 
1. Verify variables are set in Supabase Dashboard
2. Use `supabase secrets list` to verify
3. Restart function: `supabase functions deploy --no-verify-jwt`

### Issue: CORS errors
**Solution**: Edge Functions include CORS headers by default. If you see CORS errors, check the function code for `corsHeaders` configuration.

### Issue: Permission denied
**Solution**: Ensure service role key is set in environment variables and RLS policies allow service role access.

### Issue: AI API errors
**Solution**: 
1. Verify PERPLEXITY_API_KEY is set
2. Check Perplexity API quota
3. Review error messages in function logs

---

## Migration Checklist

- [ ] Install Supabase CLI
- [ ] Link to Supabase project
- [ ] Run complete_schema.sql
- [ ] Set up all environment variables
- [ ] Deploy all Edge Functions
- [ ] Test each function
- [ ] Update client code to use Edge Functions
- [ ] Remove old Next.js API routes
- [ ] Update documentation
- [ ] Monitor function logs
- [ ] Set up alerts for failures

---

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Perplexity API Docs](https://docs.perplexity.ai)
- [OpenPhone API Docs](https://docs.openphone.com)
- [Gmail API Docs](https://developers.google.com/gmail/api)

---

## Support

For issues or questions:
1. Check function logs: `supabase functions logs`
2. Review this guide
3. Check Supabase Dashboard logs
4. Consult official documentation

---

**Last Updated**: 2024
**Version**: 1.0
**Total Edge Functions**: 14
**Status**: Ready for Deployment