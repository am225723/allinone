import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { parsePhoneNumber, isValidPhoneNumber } from 'https://esm.sh/libphonenumber-js@1.10.51'
import { parse } from 'https://esm.sh/csv-parse@5.5.3/sync'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60000
const RATE_LIMIT_MAX = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  entry.count++
  return true
}

function normalizePhone(phone: string): string | null {
  try {
    if (!phone || !phone.trim()) return null
    const cleaned = phone.replace(/\s+/g, '').trim()
    if (isValidPhoneNumber(cleaned, 'US')) {
      return parsePhoneNumber(cleaned, 'US').format('E.164')
    }
    if (isValidPhoneNumber(cleaned)) {
      return parsePhoneNumber(cleaned).format('E.164')
    }
    return null
  } catch {
    return null
  }
}

function normalizeEmail(email: string): string | null {
  if (!email || !email.trim()) return null
  const normalized = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(normalized) ? normalized : null
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null
  try {
    const date = new Date(dateStr.trim())
    if (isNaN(date.getTime())) return null
    return date.toISOString().split('T')[0]
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Rate limit exceeded. Please wait before importing again.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { filename, csvText, mapping, updateMatchesByMrn = false } = body

    if (!csvText) {
      return new Response(
        JSON.stringify({ ok: false, error: 'CSV data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let records: any[]
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    } catch (parseError) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to parse CSV data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const columnMap = mapping || {}
    const getField = (row: any, field: string): string => {
      const mappedKey = columnMap[field] || field
      const keys = [mappedKey, field, field.toLowerCase(), mappedKey.toLowerCase()]
      for (const key of keys) {
        if (row[key] !== undefined) return String(row[key]).trim()
      }
      return ''
    }

    const errors: { row: number; message: string }[] = []
    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const rowNum = i + 2

      const firstName = getField(row, 'firstName') || getField(row, 'first_name')
      const lastName = getField(row, 'lastName') || getField(row, 'last_name')

      if (!firstName || !lastName) {
        errors.push({ row: rowNum, message: 'First name and last name are required' })
        skippedCount++
        continue
      }

      const mrn = getField(row, 'mrn')
      const dob = parseDate(getField(row, 'dob'))
      const preferredName = getField(row, 'preferredName') || getField(row, 'preferred_name')
      const status = getField(row, 'status') || 'active'

      if (mrn) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('mrn', mrn)
          .single()

        if (existingClient) {
          if (updateMatchesByMrn) {
            const { error: updateError } = await supabase
              .from('clients')
              .update({
                first_name: firstName,
                last_name: lastName,
                preferred_name: preferredName || null,
                dob: dob,
                status: ['active', 'inactive', 'archived'].includes(status) ? status : 'active',
                address_line1: getField(row, 'addressLine1') || getField(row, 'address_line1') || null,
                address_line2: getField(row, 'addressLine2') || getField(row, 'address_line2') || null,
                city: getField(row, 'city') || null,
                state: getField(row, 'state') || null,
                zip: getField(row, 'zip') || null,
                insurance_provider: getField(row, 'insuranceProvider') || getField(row, 'insurance_provider') || null,
                insurance_member_id: getField(row, 'insuranceMemberId') || getField(row, 'insurance_member_id') || null,
                emergency_contact_name: getField(row, 'emergencyContactName') || getField(row, 'emergency_contact_name') || null,
                emergency_contact_phone: getField(row, 'emergencyContactPhone') || getField(row, 'emergency_contact_phone') || null
              })
              .eq('id', existingClient.id)

            if (updateError) {
              errors.push({ row: rowNum, message: 'Failed to update existing client' })
              skippedCount++
            } else {
              updatedCount++
            }
            continue
          } else {
            errors.push({ row: rowNum, message: 'Client with this MRN already exists (update not enabled)' })
            skippedCount++
            continue
          }
        }
      }

      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          preferred_name: preferredName || null,
          dob: dob,
          mrn: mrn || null,
          status: ['active', 'inactive', 'archived'].includes(status) ? status : 'active',
          address_line1: getField(row, 'addressLine1') || getField(row, 'address_line1') || null,
          address_line2: getField(row, 'addressLine2') || getField(row, 'address_line2') || null,
          city: getField(row, 'city') || null,
          state: getField(row, 'state') || null,
          zip: getField(row, 'zip') || null,
          insurance_provider: getField(row, 'insuranceProvider') || getField(row, 'insurance_provider') || null,
          insurance_member_id: getField(row, 'insuranceMemberId') || getField(row, 'insurance_member_id') || null,
          emergency_contact_name: getField(row, 'emergencyContactName') || getField(row, 'emergency_contact_name') || null,
          emergency_contact_phone: getField(row, 'emergencyContactPhone') || getField(row, 'emergency_contact_phone') || null
        })
        .select()
        .single()

      if (insertError) {
        errors.push({ row: rowNum, message: 'Failed to create client' })
        skippedCount++
        continue
      }

      importedCount++

      const contactsToAdd: { type: string; value: string; label: string | null }[] = []
      
      const phone1 = normalizePhone(getField(row, 'phone'))
      if (phone1) contactsToAdd.push({ type: 'phone', value: phone1, label: getField(row, 'phoneLabel') || 'Mobile' })
      
      const phone2 = normalizePhone(getField(row, 'phone2'))
      if (phone2) contactsToAdd.push({ type: 'phone', value: phone2, label: getField(row, 'phone2Label') || 'Home' })
      
      const email1 = normalizeEmail(getField(row, 'email'))
      if (email1) contactsToAdd.push({ type: 'email', value: email1, label: getField(row, 'emailLabel') || 'Personal' })
      
      const email2 = normalizeEmail(getField(row, 'email2'))
      if (email2) contactsToAdd.push({ type: 'email', value: email2, label: getField(row, 'email2Label') || 'Work' })

      let isPrimaryPhone = true
      let isPrimaryEmail = true

      for (const contact of contactsToAdd) {
        const { data: existingContact } = await supabase
          .from('client_contacts')
          .select('id')
          .eq('type', contact.type)
          .eq('value', contact.value)
          .single()

        if (!existingContact) {
          const isPrimary = contact.type === 'phone' ? isPrimaryPhone : isPrimaryEmail
          
          await supabase
            .from('client_contacts')
            .insert({
              client_id: newClient.id,
              type: contact.type,
              value: contact.value,
              label: contact.label,
              is_primary: isPrimary,
              source: 'import'
            })
          
          if (contact.type === 'phone') isPrimaryPhone = false
          else isPrimaryEmail = false
        }
      }
    }

    const { data: job, error: jobError } = await supabase
      .from('client_import_jobs')
      .insert({
        filename: filename || 'import.csv',
        total_rows: records.length,
        imported_count: importedCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        error_count: errors.length,
        error_report: errors.length > 0 ? errors : null
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({ 
        ok: true, 
        jobId: job?.id,
        summary: {
          totalRows: records.length,
          imported: importedCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errors.length
        },
        errors: errors.slice(0, 50)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to process import' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
