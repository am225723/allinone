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
      firstName, 
      lastName, 
      preferredName, 
      dob, 
      mrn, 
      status = 'active',
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

    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({ ok: false, error: 'First name and last name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (mrn) {
      const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('mrn', mrn)
        .single()

      if (existing) {
        return new Response(
          JSON.stringify({ ok: false, error: 'A client with this MRN already exists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        preferred_name: preferredName?.trim() || null,
        dob: dob || null,
        mrn: mrn?.trim() || null,
        status,
        address_line1: addressLine1?.trim() || null,
        address_line2: addressLine2?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zip: zip?.trim() || null,
        insurance_provider: insuranceProvider?.trim() || null,
        insurance_member_id: insuranceMemberId?.trim() || null,
        emergency_contact_name: emergencyContactName?.trim() || null,
        emergency_contact_phone: emergencyContactPhone?.trim() || null,
        notes_internal: notesInternal?.trim() || null
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, client }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to create client' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
