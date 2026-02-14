import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'all'

    // Get recent activity
    if (type === 'activity') {
      const limit = parseInt(url.searchParams.get('limit') || '10')
      
      // Get recent summaries
      const { data: summaries } = await supabase
        .from('summaries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      // Get recent draft replies
      const { data: drafts } = await supabase
        .from('draft_replies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      // Get recent email logs
      const { data: emails } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      // Combine and sort by created_at
      const activity = [
        ...(summaries || []).map(s => ({ ...s, activity_type: 'summary' })),
        ...(drafts || []).map(d => ({ ...d, activity_type: 'draft' })),
        ...(emails || []).map(e => ({ ...e, activity_type: 'email' }))
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)

      return new Response(
        JSON.stringify({ ok: true, activity }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get trend data
    if (type === 'trends') {
      const days = parseInt(url.searchParams.get('days') || '7')
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: summaries } = await supabase
        .from('summaries')
        .select('created_at')
        .gte('created_at', startDate.toISOString())

      const { data: drafts } = await supabase
        .from('draft_replies')
        .select('created_at')
        .gte('created_at', startDate.toISOString())

      const { data: emails } = await supabase
        .from('email_logs')
        .select('created_at')
        .gte('created_at', startDate.toISOString())

      const trends = {
        summaries: summaries?.length || 0,
        drafts: drafts?.length || 0,
        emails: emails?.length || 0,
        total: (summaries?.length || 0) + (drafts?.length || 0) + (emails?.length || 0)
      }

      return new Response(
        JSON.stringify({ ok: true, trends }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default: get all stats
    // Overall statistics
    const { count: totalCommunications } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true })

    const { count: needsResponse } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true })
      .eq('needs_response', true)
      .eq('suppress_response', false)

    const { count: pendingDrafts } = await supabase
      .from('draft_replies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: unprocessedEmails } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('needs_response', true)

    // Calculate average response time (simplified)
    const { data: recentMessages } = await supabase
      .from('summaries')
      .select('created_at, last_message_at')
      .order('created_at', { ascending: false })
      .limit(100)

    let avgResponseTime = 0
    if (recentMessages && recentMessages.length > 0) {
      const responseTimes = recentMessages
        .filter(s => s.last_message_at)
        .map(s => {
          const created = new Date(s.created_at).getTime()
          const lastMsg = new Date(s.last_message_at!).getTime()
          return Math.abs(created - lastMsg) / 1000 / 60 // minutes
        })
      
      if (responseTimes.length > 0) {
        avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      }
    }

    // Active today (items created in last 24 hours)
    const today = new Date()
    today.setDate(today.getDate() - 1)

    const { count: activeToday } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const { count: activeEmailsToday } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    const stats = {
      totalCommunications: totalCommunications || 0,
      needsResponse: needsResponse || 0,
      pendingDrafts: pendingDrafts || 0,
      unprocessedEmails: unprocessedEmails || 0,
      avgResponseTime: Math.round(avgResponseTime),
      activeToday: (activeToday || 0) + (activeEmailsToday || 0),
      openphone: {
        total: totalCommunications || 0,
        needsResponse: needsResponse || 0,
        pendingDrafts: pendingDrafts || 0,
      },
      gmail: {
        total: unprocessedEmails || 0,
        unprocessed: unprocessedEmails || 0,
      }
    }

    return new Response(
      JSON.stringify({ ok: true, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching stats:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to fetch statistics' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})