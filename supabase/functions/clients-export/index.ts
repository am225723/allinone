import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
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
    const { status, includeArchived = false } = body

    let query = supabase
      .from('clients')
      .select(`
        *,
        client_contacts(type, value, label, is_primary)
      `)
      .order('last_name', { ascending: true })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    } else if (!includeArchived) {
      query = query.neq('status', 'archived')
    }

    const { data: clients, error } = await query

    if (error) throw error

    const headers = [
      'firstName', 'lastName', 'preferredName', 'dob', 'mrn', 'status',
      'phone', 'phoneLabel', 'phone2', 'phone2Label',
      'email', 'emailLabel', 'email2', 'email2Label',
      'addressLine1', 'addressLine2', 'city', 'state', 'zip',
      'insuranceProvider', 'insuranceMemberId',
      'emergencyContactName', 'emergencyContactPhone',
      'lastVisitAt', 'createdAt', 'updatedAt'
    ]

    const rows = (clients || []).map(client => {
      const contacts = client.client_contacts || []
      const phones = contacts.filter((c: any) => c.type === 'phone').sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      const emails = contacts.filter((c: any) => c.type === 'email').sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))

      return [
        escapeCSV(client.first_name),
        escapeCSV(client.last_name),
        escapeCSV(client.preferred_name),
        escapeCSV(client.dob),
        escapeCSV(client.mrn),
        escapeCSV(client.status),
        escapeCSV(phones[0]?.value),
        escapeCSV(phones[0]?.label),
        escapeCSV(phones[1]?.value),
        escapeCSV(phones[1]?.label),
        escapeCSV(emails[0]?.value),
        escapeCSV(emails[0]?.label),
        escapeCSV(emails[1]?.value),
        escapeCSV(emails[1]?.label),
        escapeCSV(client.address_line1),
        escapeCSV(client.address_line2),
        escapeCSV(client.city),
        escapeCSV(client.state),
        escapeCSV(client.zip),
        escapeCSV(client.insurance_provider),
        escapeCSV(client.insurance_member_id),
        escapeCSV(client.emergency_contact_name),
        escapeCSV(client.emergency_contact_phone),
        escapeCSV(client.last_visit_at),
        escapeCSV(client.created_at),
        escapeCSV(client.updated_at)
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    return new Response(
      JSON.stringify({ ok: true, csv, count: clients?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to export clients' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
