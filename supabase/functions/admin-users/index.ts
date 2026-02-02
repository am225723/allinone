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
      const { data, error } = await supabase
        .from('comm_users')
        .select('id, name, role, is_active, created_at, last_login')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, users: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { name, pin, role = 'user' } = body

      if (!name || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Name and 4-digit PIN required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: existing } = await supabase
        .from('comm_users')
        .select('id')
        .eq('pin', pin)
        .single()

      if (existing) {
        return new Response(
          JSON.stringify({ ok: false, error: 'PIN already in use' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('comm_users')
        .insert({ name, pin, role, is_active: true })
        .select('id, name, role, is_active, created_at')
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, user: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PATCH') {
      const body = await req.json()
      const { id, ...updates } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (updates.pin) {
        const { data: existing } = await supabase
          .from('comm_users')
          .select('id')
          .eq('pin', updates.pin)
          .neq('id', id)
          .single()

        if (existing) {
          return new Response(
            JSON.stringify({ ok: false, error: 'PIN already in use' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      const { data, error } = await supabase
        .from('comm_users')
        .update(updates)
        .eq('id', id)
        .select('id, name, role, is_active, created_at')
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, user: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      const body = await req.json()
      const { id } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'User ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await supabase
        .from('comm_users')
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
    console.error('Error in admin-users function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
