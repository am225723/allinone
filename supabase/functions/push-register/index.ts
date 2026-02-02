import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = req.headers.get('x-api-key')
    const pushApiSecret = Deno.env.get('PUSH_API_SECRET')

    if (!pushApiSecret || apiKey !== pushApiSecret) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { player_id, user_id, device_type, device_name } = await req.json()

    if (!player_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'player_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabase
      .from('push_devices')
      .upsert({
        player_id,
        user_id: user_id || null,
        device_type: device_type || 'web',
        device_name: device_name || null,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'player_id' })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ ok: true, device: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in push-register function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Registration failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
