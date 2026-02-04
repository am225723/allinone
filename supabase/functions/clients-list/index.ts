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
    const { search, status, sort = 'last_name', page = 1, pageSize = 50 } = body

    const offset = (page - 1) * pageSize

    let query = supabase
      .from('clients')
      .select(`
        *,
        client_contacts(id, type, value, label, is_primary, is_verified, source)
      `, { count: 'exact' })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    } else {
      query = query.neq('status', 'archived')
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase()
      query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,preferred_name.ilike.%${searchTerm}%,mrn.ilike.%${searchTerm}%`)
    }

    switch (sort) {
      case 'first_name':
        query = query.order('first_name', { ascending: true })
        break
      case 'updated':
        query = query.order('updated_at', { ascending: false })
        break
      case 'last_visit':
        query = query.order('last_visit_at', { ascending: false, nullsFirst: false })
        break
      default:
        query = query.order('last_name', { ascending: true })
    }

    query = query.range(offset, offset + pageSize - 1)

    const { data: clients, error, count } = await query

    if (error) throw error

    const clientsWithPrimary = (clients || []).map(client => {
      const contacts = client.client_contacts || []
      const primaryPhone = contacts.find((c: any) => c.type === 'phone' && c.is_primary)
      const primaryEmail = contacts.find((c: any) => c.type === 'email' && c.is_primary)
      const anyPhone = contacts.find((c: any) => c.type === 'phone')
      const anyEmail = contacts.find((c: any) => c.type === 'email')
      
      return {
        ...client,
        primary_phone: primaryPhone?.value || anyPhone?.value || null,
        primary_email: primaryEmail?.value || anyEmail?.value || null,
        contacts: contacts
      }
    })

    return new Response(
      JSON.stringify({ 
        ok: true, 
        clients: clientsWithPrimary,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to fetch clients' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
