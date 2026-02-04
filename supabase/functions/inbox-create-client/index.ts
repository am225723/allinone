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
    const { eventId, client, makePrimary = true, label, correctedValue } = body

    if (!eventId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Event ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!client || !client.firstName || !client.lastName) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Client first name and last name are required' }),
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

    const contactValue = correctedValue || event.value
    if (!contactValue) {
      return new Response(
        JSON.stringify({ ok: false, error: 'A valid contact value is required. Please provide correctedValue.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (client.mrn) {
      const { data: existingMrn } = await supabase
        .from('clients')
        .select('id')
        .eq('mrn', client.mrn)
        .single()

      if (existingMrn) {
        return new Response(
          JSON.stringify({ ok: false, error: 'A client with this MRN already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: existingContact } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('type', event.kind)
      .eq('value', contactValue)
      .single()

    if (existingContact) {
      return new Response(
        JSON.stringify({ ok: false, error: 'This contact already exists for a client' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        first_name: client.firstName.trim(),
        last_name: client.lastName.trim(),
        preferred_name: client.preferredName?.trim() || null,
        dob: client.dob || null,
        mrn: client.mrn?.trim() || null,
        status: 'active'
      })
      .select()
      .single()

    if (clientError) throw clientError

    const { data: contact, error: contactError } = await supabase
      .from('client_contacts')
      .insert({
        client_id: newClient.id,
        type: event.kind,
        value: contactValue,
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
        linked_client_id: newClient.id,
        value: contactValue
      })
      .eq('id', eventId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ ok: true, client: newClient, contact }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to create client from identity' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
