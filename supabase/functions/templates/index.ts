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
      const id = url.searchParams.get('id')
      const category = url.searchParams.get('category')
      
      if (id) {
        const { data, error } = await supabase
          .from('message_templates')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        return new Response(
          JSON.stringify({ ok: true, template: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let query = supabase
        .from('message_templates')
        .select('*')
        .order('usage_count', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, templates: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { name, content, category, variables = [] } = body

      const { data, error } = await supabase
        .from('message_templates')
        .insert({ name, content, category, variables, usage_count: 0 })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, template: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PATCH') {
      const body = await req.json()
      const { id, increment_usage, ...updates } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Template ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (increment_usage) {
        const { data: current } = await supabase
          .from('message_templates')
          .select('usage_count')
          .eq('id', id)
          .single()

        updates.usage_count = (current?.usage_count || 0) + 1
      }

      const { data, error } = await supabase
        .from('message_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, template: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      const body = await req.json()
      const { id } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Template ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('message_templates')
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
    console.error('Error in templates function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
