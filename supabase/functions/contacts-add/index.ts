import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { parsePhoneNumber, isValidPhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(phone: string): { normalized: string | null; error?: string } {
  try {
    if (!phone || !phone.trim()) return { normalized: null, error: 'Phone number is required' }
    
    const cleaned = phone.replace(/\s+/g, '').trim()
    
    if (isValidPhoneNumber(cleaned, 'US')) {
      const parsed = parsePhoneNumber(cleaned, 'US')
      return { normalized: parsed.format('E.164') }
    }
    
    if (isValidPhoneNumber(cleaned)) {
      const parsed = parsePhoneNumber(cleaned)
      return { normalized: parsed.format('E.164') }
    }
    
    return { normalized: null, error: 'Invalid phone number format' }
  } catch {
    return { normalized: null, error: 'Failed to parse phone number' }
  }
}

function normalizeEmail(email: string): { normalized: string | null; error?: string } {
  if (!email || !email.trim()) return { normalized: null, error: 'Email is required' }
  
  const normalized = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(normalized)) {
    return { normalized: null, error: 'Invalid email format' }
  }
  
  return { normalized }
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
    const { clientId, type, value, label, isPrimary = false, source = 'manual' } = body

    if (!clientId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!type || !['phone', 'email'].includes(type)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Type must be phone or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!value) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Value is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let normalizedValue: string
    if (type === 'phone') {
      const result = normalizePhone(value)
      if (!result.normalized) {
        return new Response(
          JSON.stringify({ ok: false, error: result.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      normalizedValue = result.normalized
    } else {
      const result = normalizeEmail(value)
      if (!result.normalized) {
        return new Response(
          JSON.stringify({ ok: false, error: result.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      normalizedValue = result.normalized
    }

    const { data: existing } = await supabase
      .from('client_contacts')
      .select('id, client_id')
      .eq('type', type)
      .eq('value', normalizedValue)
      .single()

    if (existing) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: existing.client_id === clientId 
            ? 'This contact already exists for this client'
            : 'This contact is already associated with another client'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (isPrimary) {
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('client_id', clientId)
        .eq('type', type)
    }

    const { data: contact, error } = await supabase
      .from('client_contacts')
      .insert({
        client_id: clientId,
        type,
        value: normalizedValue,
        label: label?.trim() || null,
        is_primary: isPrimary,
        source
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, contact }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to add contact' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
