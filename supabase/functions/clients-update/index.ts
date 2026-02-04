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
    const { 
      id,
      firstName, 
      lastName, 
      preferredName, 
      dob, 
      mrn,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      insuranceProvider,
      insuranceMemberId,
      emergencyContactName,
      emergencyContactPhone,
      notesInternal
    } = body

    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (mrn) {
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('mrn', mrn)
        .neq('id', id)
        .single()

      if (existing) {
        return new Response(
          JSON.stringify({ ok: false, error: 'A different client with this MRN already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const updates: Record<string, any> = {}
    if (firstName !== undefined) updates.first_name = firstName.trim()
    if (lastName !== undefined) updates.last_name = lastName.trim()
    if (preferredName !== undefined) updates.preferred_name = preferredName?.trim() || null
    if (dob !== undefined) updates.dob = dob || null
    if (mrn !== undefined) updates.mrn = mrn?.trim() || null
    if (addressLine1 !== undefined) updates.address_line1 = addressLine1?.trim() || null
    if (addressLine2 !== undefined) updates.address_line2 = addressLine2?.trim() || null
    if (city !== undefined) updates.city = city?.trim() || null
    if (state !== undefined) updates.state = state?.trim() || null
    if (zip !== undefined) updates.zip = zip?.trim() || null
    if (insuranceProvider !== undefined) updates.insurance_provider = insuranceProvider?.trim() || null
    if (insuranceMemberId !== undefined) updates.insurance_member_id = insuranceMemberId?.trim() || null
    if (emergencyContactName !== undefined) updates.emergency_contact_name = emergencyContactName?.trim() || null
    if (emergencyContactPhone !== undefined) updates.emergency_contact_phone = emergencyContactPhone?.trim() || null
    if (notesInternal !== undefined) updates.notes_internal = notesInternal?.trim() || null

    const { data: client, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, client }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to update client' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
