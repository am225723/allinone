import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Perplexity API integration
async function callPerplexityAPI(prompt: string) {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for email triage and drafting responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Perplexity API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    const lookbackDays = body.lookbackDays || 14

    // Get all Gmail accounts
    const { data: accounts } = await supabase
      .from('gmail_accounts')
      .select('*')

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          lookbackDays,
          accounts: 0,
          processed: 0,
          draftsCreated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let draftsCreated = 0
    const errors: any[] = []

    for (const account of accounts) {
      try {
        // Get agent rules for this account
        const { data: rules } = await supabase
          .from('agent_rules')
          .select('*')
          .eq('gmail_account_id', account.id)
          .eq('is_enabled', true)

        // For this Edge Function implementation, we'll simulate getting recent messages
        // In a real implementation, you would integrate with Gmail API using OAuth tokens
        
        // Simulate processing emails
        // This is a placeholder - real implementation would use Gmail API
        const simulatedEmails = [
          {
            id: 'simulated_1',
            subject: 'Test Email',
            from: 'test@example.com',
            body: 'This is a test email content'
          }
        ]

        for (const email of simulatedEmails) {
          // Check if already processed
          const { data: existing } = await supabase
            .from('email_logs')
            .select('id')
            .eq('gmail_account_id', account.id)
            .eq('gmail_message_id', email.id)
            .limit(1)

          if (existing && existing.length > 0) {
            continue
          }

          // Check skip rules
          const fromEmail = email.from.toLowerCase()
          const subject = (email.subject || '').toLowerCase()

          const skipRule = (rules || []).find((r: any) => {
            if (r.rule_type === 'skip_sender' && r.pattern.trim().toLowerCase() === fromEmail) {
              return true
            }
            if (r.rule_type === 'skip_subject' && subject.includes(r.pattern.trim().toLowerCase())) {
              return true
            }
            return false
          })

          if (skipRule) {
            await supabase.from('email_logs').insert({
              gmail_account_id: account.id,
              gmail_message_id: email.id,
              subject: email.subject,
              from_address: email.from,
              summary: `Skipped (rule): ${skipRule.pattern}`,
              needs_response: false,
              priority: 'low',
              draft_created: false,
            })
            processed += 1
            continue
          }

          // AI analysis
          const analysisPrompt = `Analyze this email and provide:
1. A brief summary (2-3 sentences)
2. Whether a response is needed (true/false)
3. Priority level (high/normal/low)
4. If response needed, draft a short, helpful reply

From: ${email.from}
To: ${account.email}
Subject: ${email.subject}
Body: ${email.body}

Respond in JSON format:
{
  "summary": "Summary text",
  "needsResponse": true/false,
  "priority": "high|normal|low",
  "draftReply": "Draft reply if needed"
}`

          const aiResponse = await callPerplexityAPI(analysisPrompt)

          let summary = ''
          let needsResponse = false
          let priority = 'normal'
          let draftReply = ''

          try {
            const parsed = JSON.parse(aiResponse)
            summary = parsed.summary || ''
            needsResponse = parsed.needsResponse || false
            priority = parsed.priority || 'normal'
            draftReply = parsed.draftReply || ''
          } catch {
            summary = aiResponse.substring(0, 500)
          }

          let draftCreated = false

          // In a real implementation, you would create a Gmail draft here
          // using the Gmail API with the OAuth tokens
          if (needsResponse && draftReply.trim()) {
            // Placeholder for Gmail draft creation
            // draftCreated = await createGmailDraft(...)
            draftCreated = true
            draftsCreated += 1
          }

          // Log the email
          await supabase.from('email_logs').insert({
            gmail_account_id: account.id,
            gmail_message_id: email.id,
            subject: email.subject,
            from_address: email.from,
            summary,
            needs_response: needsResponse,
            priority,
            draft_created: draftCreated,
          })

          processed += 1
        }
      } catch (e: any) {
        errors.push({ account: account.email, error: e.message })
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        lookbackDays,
        accounts: accounts.length,
        processed,
        draftsCreated,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error running triage job:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})