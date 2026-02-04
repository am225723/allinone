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
    const { contactId, label, isPrimary, isVerified } = body

    if (!contactId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Contact ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: existingContact, error: fetchError } = await supabase
      .from('client_contacts')
      .select('client_id, type')
      .eq('id', contactId)
      .single()

    if (fetchError || !existingContact) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Contact not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (isPrimary === true) {
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('client_id', existingContact.client_id)
        .eq('type', existingContact.type)
        .neq('id', contactId)
    }

    const updates: Record<string, any> = {}
    if (label !== undefined) updates.label = label?.trim() || null
    if (isPrimary !== undefined) updates.is_primary = isPrimary
    if (isVerified !== undefined) updates.is_verified = isVerified

    const { data: contact, error } = await supabase
      .from('client_contacts')
      .update(updates)
      .eq('id', contactId)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, contact }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to update contact' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
