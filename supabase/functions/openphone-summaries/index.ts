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

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const needsResponse = url.searchParams.get('needsResponse')

    let query = supabase
      .from('summaries')
      .select('*')
      .order('created_at', { ascending: false })

    if (needsResponse === 'true') {
      query = query.eq('needs_response', true).eq('suppress_response', false)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: summaries } = await query

    return new Response(
      JSON.stringify({ ok: true, summaries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching summaries:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to fetch summaries' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})