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

    if (req.method === 'GET') {
      const accountId = url.searchParams.get('account_id')
      
      let query = supabase
        .from('agent_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (accountId) {
        query = query.eq('gmail_account_id', accountId)
      }

      const { data, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, rules: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { gmail_account_id, rule_type, pattern, is_enabled = true } = body

      if (!gmail_account_id || !rule_type || !pattern) {
        return new Response(
          JSON.stringify({ ok: false, error: 'gmail_account_id, rule_type, and pattern required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('agent_rules')
        .insert({ gmail_account_id, rule_type, pattern, is_enabled })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, rule: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PATCH') {
      const body = await req.json()
      const { id, ...updates } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Rule ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('agent_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, rule: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      const body = await req.json()
      const { id } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Rule ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('agent_rules')
        .delete()
        .eq('id', id)

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in gmail-rules function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
