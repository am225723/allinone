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

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('category', 'openphone')

      if (error) throw error

      const settings: Record<string, any> = {}
      for (const row of data || []) {
        try {
          settings[row.key] = JSON.parse(row.value)
        } catch {
          settings[row.key] = row.value
        }
      }

      const { data: suppressions } = await supabase
        .from('suppressions')
        .select('*')
        .order('created_at', { ascending: false })

      return new Response(
        JSON.stringify({ ok: true, settings, suppressions: suppressions || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.json()
      const { settings, suppressions } = body

      if (settings && typeof settings === 'object') {
        for (const [key, value] of Object.entries(settings)) {
          await supabase
            .from('app_settings')
            .upsert({ 
              key, 
              value: JSON.stringify(value), 
              category: 'openphone',
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
        }
      }

      if (Array.isArray(suppressions)) {
        await supabase.from('suppressions').delete().neq('id', '')
        
        if (suppressions.length > 0) {
          await supabase.from('suppressions').insert(suppressions)
        }
      }

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
    console.error('Error in openphone-settings function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
