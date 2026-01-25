import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// OpenPhone API integration
async function callOpenPhoneAPI(endpoint: string, apiKey: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.openphone.com/v1${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenPhone API error: ${error}`)
  }

  return response.json()
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
          content: 'You are a helpful AI assistant for conversation summarization and drafting responses.'
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

    const openPhoneApiKey = Deno.env.get('OPENPHONE_API_KEY')
    if (!openPhoneApiKey) {
      throw new Error('OPENPHONE_API_KEY not configured')
    }

    const { startDate, endDate, resumeRunId } = await req.json()

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'startDate and endDate are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const maxPerRun = parseInt(Deno.env.get('MAX_CONVERSATIONS_PER_RUN') || '25')

    const startIso = new Date(startDate + 'T00:00:00.000Z').toISOString()
    const endIso = new Date(endDate + 'T23:59:59.999Z').toISOString()

    let runId = resumeRunId || null
    let checkpoint: any = null

    // Create or resume run
    if (runId) {
      const { data: run } = await supabase.from('runs').select('*').eq('id', runId).single()
      checkpoint = run?.checkpoint || null
    } else {
      const { data: created } = await supabase.from('runs')
        .insert({ start_date: startDate, end_date: endDate, status: 'running', checkpoint: null })
        .select('id')
        .single()
      runId = created?.id
      if (!runId) throw new Error('Failed to create run')
    }

    let processed = 0
    let errors: Array<{ conversationId?: string; step: string; message: string }> = []

    try {
      // List conversations
      const conversations = await callOpenPhoneAPI(
        `/conversations?updatedAfter=${startIso}&updatedBefore=${endIso}&limit=${Math.min(100, maxPerRun)}`,
        openPhoneApiKey
      )

      for (const convo of conversations.data || []) {
        if (processed >= maxPerRun) break
        if (convo.deletedAt) continue

        const participant = convo.participants?.[0]
        if (!participant) continue

        try {
          // Fetch messages
          let pageToken: string | null = null
          const rawMessages: any[] = []
          
          while (true) {
            const endpoint = `/messages?phoneNumberId=${convo.phoneNumberId}&participants[]=${participant}&createdAfter=${startIso}&createdBefore=${endIso}`
            const page = await callOpenPhoneAPI(endpoint + (pageToken ? `&pageToken=${pageToken}` : ''), openPhoneApiKey)
            rawMessages.push(...(page.data || []))
            
            if (!page.nextPageToken) break
            pageToken = page.nextPageToken
            if (rawMessages.length > 500) break
          }

          // Filter out automated messages
          const IGNORE_TEXT = "Thank you for reaching out to Dr. Zelisko's office. I am currently assisting another patient and want to provide you with the same focused attention. So we can best prepare to assist you, please reply with your name and a brief reason for your call. We will in touch as soon as we are available."
          const messages = rawMessages
            .filter(m => {
              const t = (m.text || '').replace(/\s+/g, ' ').trim()
              return t !== IGNORE_TEXT
            })

          // Build transcript
          const transcript = messages
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(m => `[${m.createdAt}] ${m.direction === 'incoming' ? 'IN' : 'OUT'}: ${m.text}`)
            .join('\n')

          // Check suppressions
          const { data: dbSuppressions } = await supabase
            .from('suppressions')
            .select('kind,value,reason')
            .in('kind', ['phone', 'conversation'])
            .or(`value.eq.${participant},value.eq.${convo.id}`)
            .limit(20)

          let suppressed = false
          let suppressReason = ''

          if (dbSuppressions && dbSuppressions.length > 0) {
            suppressed = true
            suppressReason = dbSuppressions[0].reason || `Suppressed by ${dbSuppressions[0].kind}`
          } else {
            // Check phrase suppressions
            const { data: phraseSuppressions } = await supabase
              .from('suppressions')
              .select('value,reason')
              .eq('kind', 'phrase')
              .limit(200)

            for (const row of phraseSuppressions || []) {
              const v = String(row.value || '').trim()
              if (v && transcript.toLowerCase().includes(v.toLowerCase())) {
                suppressed = true
                suppressReason = row.reason || `Transcript contains blocked phrase: ${v}`
                break
              }
            }
          }

          // Get last inbound/outbound
          const lastIn = messages.filter(m => m.direction === 'incoming').pop()
          const lastOut = messages.filter(m => m.direction === 'outgoing').pop()
          const lastAt = messages.length ? messages.map(m => m.createdAt).sort().pop() : null

          // AI analysis
          const analysisPrompt = `Analyze this conversation transcript and provide:
1. A brief summary (2-3 sentences)
2. Main topics discussed (array of 3-5 keywords)
3. Whether a response is needed (true/false)
4. If response needed, draft a short, helpful reply

Transcript:
${transcript || '(no messages in window)'}

Respond in JSON format:
{
  "summary": "Summary text",
  "topics": ["topic1", "topic2", "topic3"],
  "needsResponse": true/false,
  "draftReply": "Draft reply if needed"
}`

          const aiResponse = await callPerplexityAPI(analysisPrompt)
          
          let summary = ''
          let topics: string[] = []
          let needsResponse = false
          let draftReply = ''

          try {
            const parsed = JSON.parse(aiResponse)
            summary = parsed.summary || ''
            topics = parsed.topics || []
            needsResponse = parsed.needsResponse || false
            draftReply = parsed.draftReply || ''
          } catch {
            summary = aiResponse.substring(0, 500)
          }

          const needs = needsResponse && !suppressed
          const needsReason = suppressed 
            ? `Suppressed: ${suppressReason}` 
            : (needs ? 'Inbound message appears to require a response' : 'No response needed')

          // Store summary
          await supabase.from('summaries').insert({
            run_id: runId,
            conversation_id: convo.id,
            contact_name: convo.name || 'Unknown Contact',
            phone: participant,
            date_range: `${startDate} → ${endDate}`,
            summary,
            topics,
            needs_response: needs,
            suppress_response: suppressed,
            last_inbound: lastIn?.text || null,
            last_outbound: lastOut?.text || null,
            last_message_at: lastAt ? new Date(lastAt).toISOString() : null,
            needs_response_reason: needsReason
          })

          // Create draft if needed
          if (needs) {
            const fallback = lastIn?.text
              ? `Thanks for reaching out — I got your message. Can you share a bit more detail (or confirm your preferred time) so I can help?`
              : `Thanks for reaching out — I can help. What's the best next step on your end?`

            await supabase.from('draft_replies').insert({
              run_id: runId,
              conversation_id: convo.id,
              phone: participant,
              from_phone_number_id: convo.phoneNumberId,
              user_id: null,
              draft_text: draftReply.trim() || fallback,
              status: 'pending',
              suppressed: false
            })
          }

          processed += 1
        } catch (e: any) {
          errors.push({ conversationId: convo.id, step: 'conversation', message: e?.message || String(e) })
        }
      }

      // Update run status
      const newCheckpoint = {
        pageToken: null,
        processed,
        errors,
        lastProcessedAt: new Date().toISOString()
      }

      const status = 'completed'
      await supabase.from('runs')
        .update({ status, checkpoint: newCheckpoint, updated_at: new Date().toISOString() })
        .eq('id', runId)

      return new Response(
        JSON.stringify({ runId, processed, errorsCount: errors.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (e: any) {
      // Update run as failed
      const failCheckpoint = {
        pageToken: checkpoint?.pageToken || null,
        processed,
        errors: [...errors, { step: 'run', message: e?.message || String(e) }],
        lastProcessedAt: new Date().toISOString()
      }

      await supabase.from('runs')
        .update({ status: 'failed', checkpoint: failCheckpoint, updated_at: new Date().toISOString() })
        .eq('id', runId)

      throw e
    }
  } catch (error) {
    console.error('Run error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})