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

    const body = await req.json().catch(() => ({}))
    const { source, status = 'new', page = 1, pageSize = 50 } = body

    const offset = (page - 1) * pageSize

    let query = supabase
      .from('inbound_identity_events')
      .select(`
        *,
        linked_client:clients(id, first_name, last_name, mrn)
      `, { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (source && source !== 'all') {
      query = query.eq('source', source)
    }

    const { data: events, error, count } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        ok: true, 
        events: events || [],
        total: count || 0,
        page,
        pageSize
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to fetch inbox events' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
