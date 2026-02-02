import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toCSV(data: any[], columns: string[]): string {
  const header = columns.join(',')
  const rows = data.map(row => 
    columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      const str = String(val).replace(/"/g, '""')
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

function toHTML(data: any[], title: string): string {
  if (!data.length) return '<html><body><p>No data</p></body></html>'
  
  const columns = Object.keys(data[0])
  const headerRow = columns.map(c => `<th>${c}</th>`).join('')
  const bodyRows = data.map(row => 
    `<tr>${columns.map(c => `<td>${row[c] ?? ''}</td>`).join('')}</tr>`
  ).join('')
  
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4a5568; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    h1 { color: #2d3748; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`
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
    const type = url.searchParams.get('type') || 'summaries'
    const format = url.searchParams.get('format') || 'json'
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    let data: any[] = []
    let columns: string[] = []
    let title = ''

    switch (type) {
      case 'summaries': {
        title = 'Conversation Summaries'
        let query = supabase.from('summaries').select('*').order('created_at', { ascending: false })
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate)
        const { data: result } = await query
        data = result || []
        columns = ['id', 'phone_number', 'summary', 'needs_response', 'created_at']
        break
      }

      case 'drafts': {
        title = 'Draft Replies'
        let query = supabase.from('draft_replies').select('*').order('created_at', { ascending: false })
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate)
        const { data: result } = await query
        data = result || []
        columns = ['id', 'summary_id', 'content', 'status', 'created_at']
        break
      }

      case 'emails': {
        title = 'Email Logs'
        let query = supabase.from('email_logs').select('*').order('created_at', { ascending: false })
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate)
        const { data: result } = await query
        data = result || []
        columns = ['id', 'gmail_account_id', 'subject', 'from_address', 'summary', 'priority', 'created_at']
        break
      }

      case 'activity': {
        title = 'Recent Activity'
        const { data: summaries } = await supabase.from('summaries').select('*').order('created_at', { ascending: false }).limit(50)
        const { data: drafts } = await supabase.from('draft_replies').select('*').order('created_at', { ascending: false }).limit(50)
        const { data: emails } = await supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(50)
        
        data = [
          ...(summaries || []).map(s => ({ ...s, type: 'summary' })),
          ...(drafts || []).map(d => ({ ...d, type: 'draft' })),
          ...(emails || []).map(e => ({ ...e, type: 'email' }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        columns = ['type', 'id', 'created_at']
        break
      }

      case 'tasks': {
        title = 'Tasks'
        let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate)
        const { data: result } = await query
        data = result || []
        columns = ['id', 'title', 'description', 'status', 'priority', 'due_date', 'created_at']
        break
      }

      case 'notes': {
        title = 'Clinical Notes'
        let query = supabase.from('clinical_notes').select('*').order('created_at', { ascending: false })
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate)
        const { data: result } = await query
        data = result || []
        columns = ['id', 'patient_name', 'patient_id', 'status', 'created_at']
        break
      }

      default:
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid export type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (format === 'csv') {
      return new Response(toCSV(data, columns), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}_export.csv"`,
        },
      })
    }

    if (format === 'html') {
      return new Response(toHTML(data, title), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
        },
      })
    }

    return new Response(
      JSON.stringify({ ok: true, data, count: data.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in export function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Export failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
