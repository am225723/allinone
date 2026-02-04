import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { parsePhoneNumber, isValidPhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60000
const RATE_LIMIT_MAX = 100

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  entry.count++
  return true
}

function normalizePhone(phone: string): { normalized: string | null; display: string } {
  const display = phone || ''
  try {
    if (!phone || !phone.trim()) return { normalized: null, display }
    
    const cleaned = phone.replace(/\s+/g, '').trim()
    
    if (isValidPhoneNumber(cleaned, 'US')) {
      const parsed = parsePhoneNumber(cleaned, 'US')
      return { normalized: parsed.format('E.164'), display }
    }
    
    if (isValidPhoneNumber(cleaned)) {
      const parsed = parsePhoneNumber(cleaned)
      return { normalized: parsed.format('E.164'), display }
    }
    
    return { normalized: null, display }
  } catch {
    return { normalized: null, display }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Rate limit exceeded' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { phone, occurredAt, meta } = body

    if (!phone) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { normalized, display } = normalizePhone(phone)

    if (normalized) {
      const { data: contact } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('type', 'phone')
        .eq('value', normalized)
        .single()

      if (contact) {
        return new Response(
          JSON.stringify({ 
            ok: true, 
            matched: true, 
            clientId: contact.client_id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: existingEvent } = await supabase
      .from('inbound_identity_events')
      .select('id, status, linked_client_id')
      .eq('source', 'quo')
      .eq('kind', 'phone')
      .eq('value', normalized)
      .eq('status', 'new')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .single()

    if (existingEvent) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          matched: false, 
          eventId: existingEvent.id,
          existing: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const safeMetaFields = ['messageId', 'direction', 'threadId']
    const safeMeta = meta ? Object.fromEntries(
      Object.entries(meta).filter(([key]) => safeMetaFields.includes(key))
    ) : null

    const { data: event, error } = await supabase
      .from('inbound_identity_events')
      .insert({
        source: 'quo',
        kind: 'phone',
        value: normalized,
        display_value: display,
        occurred_at: occurredAt || new Date().toISOString(),
        status: 'new',
        meta: safeMeta
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        ok: true, 
        matched: false, 
        eventId: event.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to process inbound identity' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
