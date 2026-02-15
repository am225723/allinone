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

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: messagesProcessed } = await supabase
      .from('summaries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    const { count: emailsProcessed } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    const { count: draftsCreated } = await supabase
      .from('draft_replies')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    const { count: tasksCompleted } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', yesterday.toISOString())
      .lt('updated_at', today.toISOString())

    const { data: existingSummary } = await supabase
      .from('daily_summaries')
      .select('id')
      .eq('summary_date', yesterday.toISOString().split('T')[0])
      .single()

    const summaryData = {
      summary_date: yesterday.toISOString().split('T')[0],
      messages_processed: messagesProcessed || 0,
      emails_processed: emailsProcessed || 0,
      drafts_created: draftsCreated || 0,
      tasks_completed: tasksCompleted || 0,
    }

    if (existingSummary) {
      await supabase
        .from('daily_summaries')
        .update(summaryData)
        .eq('id', existingSummary.id)
    } else {
      await supabase.from('daily_summaries').insert(summaryData)
    }

    await supabase.from('notifications').insert({
      type: 'info',
      channel: 'system',
      title: 'Daily Summary Ready',
      message: `Yesterday: ${messagesProcessed || 0} messages, ${emailsProcessed || 0} emails, ${draftsCreated || 0} drafts, ${tasksCompleted || 0} tasks completed.`,
      priority: 'normal',
      read: false,
    })

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Daily summary generated',
        summary: summaryData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cron daily summary error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error?.message || 'Cron job failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
