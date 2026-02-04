import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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

function normalizeEmail(email: string): { normalized: string | null; display: string } {
  const display = email || ''
  try {
    if (!email || !email.trim()) return { normalized: null, display }
    
    const normalized = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!emailRegex.test(normalized)) {
      return { normalized: null, display }
    }
    
    return { normalized, display }
  } catch {
    return { normalized: null, display }
  }
}

function extractEmail(input: string): string {
  const match = input.match(/<([^>]+)>/)
  if (match) return match[1]
  return input.trim()
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
    const { email, occurredAt, meta } = body

    if (!email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const extractedEmail = extractEmail(email)
    const { normalized, display } = normalizeEmail(extractedEmail)

    if (normalized) {
      const { data: contact } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('type', 'email')
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
      .eq('source', 'gmail')
      .eq('kind', 'email')
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

    const safeMetaFields = ['messageId', 'threadId', 'subjectHash']
    const safeMeta = meta ? Object.fromEntries(
      Object.entries(meta).filter(([key]) => safeMetaFields.includes(key))
    ) : null

    const { data: event, error } = await supabase
      .from('inbound_identity_events')
      .insert({
        source: 'gmail',
        kind: 'email',
        value: normalized,
        display_value: email,
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
