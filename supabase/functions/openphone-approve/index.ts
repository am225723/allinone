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

    const { draftId, edit } = await req.json()

    const updateData: any = {
      status: 'approved',
      updated_at: new Date().toISOString()
    }

    if (edit) {
      updateData.draft_text = edit
    }

    const { error } = await supabase
      .from('draft_replies')
      .update(updateData)
      .eq('id', draftId)

    return new Response(
      JSON.stringify({ ok: !error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error approving draft:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to approve draft' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})