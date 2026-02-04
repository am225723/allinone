import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { eventId, reason } = body

    if (!eventId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Event ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: event, error: fetchError } = await supabase
      .from('inbound_identity_events')
      .select('status')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (event.status !== 'new') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Event has already been processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error } = await supabase
      .from('inbound_identity_events')
      .update({ 
        status: 'ignored',
        ignore_reason: reason?.trim() || null
      })
      .eq('id', eventId)

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to ignore event' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
