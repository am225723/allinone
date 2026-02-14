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
      const type = url.searchParams.get('type') || 'all'
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      // Get unread notifications
      if (type === 'unread') {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(limit)

        return new Response(
          JSON.stringify({ ok: true, notifications }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get notification count
      if (type === 'count') {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('read', false)

        return new Response(
          JSON.stringify({ ok: true, count: count || 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get all notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return new Response(
        JSON.stringify({ ok: true, notifications }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const { action, notificationId, notification } = await req.json()

      // Mark notification as read
      if (action === 'mark-read') {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId)

        return new Response(
          JSON.stringify({ ok: !error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark all notifications as read
      if (action === 'mark-all-read') {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('read', false)

        return new Response(
          JSON.stringify({ ok: !error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete notification
      if (action === 'delete') {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)

        return new Response(
          JSON.stringify({ ok: !error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create new notification
      if (action === 'create' && notification) {
        const { error } = await supabase
          .from('notifications')
          .insert({
            type: notification.type || 'info',
            channel: notification.channel || 'system',
            title: notification.title,
            message: notification.message,
            priority: notification.priority || 'normal',
            read: false,
            metadata: notification.metadata || null,
          })

        return new Response(
          JSON.stringify({ ok: !error }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling notification action:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Action failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})