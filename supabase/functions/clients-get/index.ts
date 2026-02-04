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

    const body = await req.json()
    const { id } = body

    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_contacts(id, type, value, label, is_primary, is_verified, source, created_at)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ ok: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    const contacts = client.client_contacts || []
    const primaryPhone = contacts.find((c: any) => c.type === 'phone' && c.is_primary)
    const primaryEmail = contacts.find((c: any) => c.type === 'email' && c.is_primary)

    return new Response(
      JSON.stringify({ 
        ok: true, 
        client: {
          ...client,
          primary_phone: primaryPhone?.value || null,
          primary_email: primaryEmail?.value || null,
          contacts
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to fetch client' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
