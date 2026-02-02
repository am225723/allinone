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

    const url = new URL(req.url)

    if (req.method === 'GET') {
      const id = url.searchParams.get('id')
      
      if (id) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        return new Response(
          JSON.stringify({ ok: true, task: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const status = url.searchParams.get('status')
      const priority = url.searchParams.get('priority')
      const assignee = url.searchParams.get('assignee')
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) {
        const statuses = status.split(',')
        query = query.in('status', statuses)
      }

      if (priority) {
        query = query.eq('priority', priority)
      }

      if (assignee) {
        query = query.eq('assignee', assignee)
      }

      const { data, error, count } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true, tasks: data || [], total: count || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { 
        title, 
        description, 
        status = 'pending', 
        priority = 'medium',
        due_date,
        assignee,
        checklist,
        tags 
      } = body

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          description,
          status,
          priority,
          due_date,
          assignee,
          checklist: checklist || [],
          tags: tags || [],
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('tasks_history').insert({
        task_id: data.id,
        action: 'created',
        changes: { title, status, priority },
      })

      return new Response(
        JSON.stringify({ ok: true, task: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PATCH') {
      const body = await req.json()
      const { id, ...updates } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Task ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: oldTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await supabase.from('tasks_history').insert({
        task_id: id,
        action: 'updated',
        changes: updates,
        previous_values: oldTask,
      })

      return new Response(
        JSON.stringify({ ok: true, task: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      const body = await req.json()
      const { id } = body

      if (!id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Task ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabase.from('tasks_history').delete().eq('task_id', id)
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in tasks function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
