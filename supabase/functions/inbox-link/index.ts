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
    const { eventId, clientId, makePrimary = false, label } = body

    if (!eventId || !clientId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Event ID and Client ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: event, error: eventError } = await supabase
      .from('inbound_identity_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
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

    if (!event.value) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Event has no valid normalized value. Please create client with corrected contact.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingContact } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('type', event.kind)
      .eq('value', event.value)
      .single()

    if (existingContact) {
      return new Response(
        JSON.stringify({ ok: false, error: 'This contact already exists for a client' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (makePrimary) {
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('client_id', clientId)
        .eq('type', event.kind)
    }

    const { data: contact, error: contactError } = await supabase
      .from('client_contacts')
      .insert({
        client_id: clientId,
        type: event.kind,
        value: event.value,
        label: label?.trim() || null,
        is_primary: makePrimary,
        source: event.source
      })
      .select()
      .single()

    if (contactError) throw contactError

    const { error: updateError } = await supabase
      .from('inbound_identity_events')
      .update({ 
        status: 'linked',
        linked_client_id: clientId
      })
      .eq('id', eventId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ ok: true, contact }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to link identity to client' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
