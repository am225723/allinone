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
      const url = new URL(req.url)
      const query = url.searchParams.get('q') || ''
      
      if (query.length < 2) {
        return new Response(
          JSON.stringify({ ok: true, suggestions: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Search for suggestions in summaries
      const { data: summarySuggestions } = await supabase
        .from('summaries')
        .select('contact_name, phone')
        .or(`contact_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5)

      const suggestions = [
        ...(summarySuggestions || []).map(s => ({
          type: 'contact',
          label: s.contact_name,
          value: s.phone,
        }))
      ]

      return new Response(
        JSON.stringify({ ok: true, suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const params = await req.json()
      const { query, channel, priority, dateRange, responseStatus } = params

      let results: any[] = []

      // Search in OpenPhone summaries
      if (!channel || channel === 'openphone') {
        let queryBuilder = supabase
          .from('summaries')
          .select('*')

        if (query) {
          queryBuilder = queryBuilder.or(`contact_name.ilike.%${query}%,phone.ilike.%${query}%,summary.ilike.%${query}%`)
        }

        if (responseStatus) {
          if (responseStatus === 'needs-response') {
            queryBuilder = queryBuilder.eq('needs_response', true).eq('suppress_response', false)
          } else if (responseStatus === 'pending') {
            queryBuilder = queryBuilder.eq('needs_response', true)
          } else if (responseStatus === 'responded') {
            queryBuilder = queryBuilder.eq('needs_response', false)
          }
        }

        if (dateRange?.start && dateRange?.end) {
          queryBuilder = queryBuilder
            .gte('created_at', new Date(dateRange.start).toISOString())
            .lte('created_at', new Date(dateRange.end).toISOString())
        }

        queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(50)

        const { data: summaries } = await queryBuilder
        if (summaries) {
          results.push(...summaries.map(s => ({ ...s, channel: 'openphone' })))
        }
      }

      // Search in Gmail email logs
      if (!channel || channel === 'gmail') {
        let queryBuilder = supabase
          .from('email_logs')
          .select('*')

        if (query) {
          queryBuilder = queryBuilder.or(`subject.ilike.%${query}%,from_address.ilike.%${query}%,summary.ilike.%${query}%`)
        }

        if (priority) {
          queryBuilder = queryBuilder.eq('priority', priority)
        }

        if (responseStatus === 'needs-response') {
          queryBuilder = queryBuilder.eq('needs_response', true)
        }

        if (dateRange?.start && dateRange?.end) {
          queryBuilder = queryBuilder
            .gte('created_at', new Date(dateRange.start).toISOString())
            .lte('created_at', new Date(dateRange.end).toISOString())
        }

        queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(50)

        const { data: emails } = await queryBuilder
        if (emails) {
          results.push(...emails.map(e => ({ ...e, channel: 'gmail' })))
        }
      }

      // Smart filters
      if (query === 'urgent') {
        const { data: urgentEmails } = await supabase
          .from('email_logs')
          .select('*')
          .eq('priority', 'high')
          .eq('needs_response', true)
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (urgentEmails) {
          results.push(...urgentEmails.map(e => ({ ...e, channel: 'gmail', smart_filter: 'urgent' })))
        }
      }

      if (query === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data: todaySummaries } = await supabase
          .from('summaries')
          .select('*')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)

        if (todaySummaries) {
          results.push(...todaySummaries.map(s => ({ ...s, channel: 'openphone', smart_filter: 'today' })))
        }

        const { data: todayEmails } = await supabase
          .from('email_logs')
          .select('*')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)

        if (todayEmails) {
          results.push(...todayEmails.map(e => ({ ...e, channel: 'gmail', smart_filter: 'today' })))
        }
      }

      // Sort results by created_at
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return new Response(
        JSON.stringify({ ok: true, results, count: results.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error searching:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})