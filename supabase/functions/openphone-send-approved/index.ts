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

    // Get all approved drafts
    const { data: drafts, error } = await supabase
      .from('draft_replies')
      .select('*')
      .eq('status', 'approved')
      .eq('suppressed', false)

    if (error || !drafts) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No approved drafts found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    let failed = 0
    const errors: any[] = []

    for (const draft of drafts) {
      try {
        // Send message via OpenPhone API
        await callOpenPhoneAPI('/messages', openPhoneApiKey, {
          method: 'POST',
          body: JSON.stringify({
            phoneNumberId: draft.from_phone_number_id,
            participant: draft.phone,
            text: draft.draft_text
          })
        })

        // Update draft status
        await supabase
          .from('draft_replies')
          .update({ status: 'sent', updated_at: new Date().toISOString() })
          .eq('id', draft.id)

        sent += 1
      } catch (e: any) {
        failed += 1
        errors.push({ draftId: draft.id, error: e.message })
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, failed, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending approved drafts:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to send approved drafts' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})