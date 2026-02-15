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
    const authHeader = req.headers.get('authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:5000'

    const response = await fetch(`${appUrl}/api/openphone/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automated: true }),
    })

    const result = await response.json()

    if (result.processed > 0 || result.draftsCreated > 0) {
      await supabase.from('notifications').insert({
        type: 'info',
        channel: 'openphone',
        title: 'OpenPhone Cleanup Completed',
        message: `Processed ${result.processed || 0} conversations. Created ${result.draftsCreated || 0} drafts.`,
        priority: 'normal',
        read: false,
      })
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'OpenPhone cleanup completed',
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cron OpenPhone cleanup error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || 'Cron job failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
