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

    const { action, ids, type, data } = await req.json()

    let result: any = { success: 0, failed: 0, errors: [] }

    // Bulk approve drafts
    if (action === 'approve') {
      const { error } = await supabase
        .from('draft_replies')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .in('id', ids)

      result.success = error ? 0 : ids.length
      result.failed = error ? ids.length : 0
      if (error) result.errors.push(error.message)
    }

    // Bulk reject drafts
    else if (action === 'reject') {
      const { error } = await supabase
        .from('draft_replies')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .in('id', ids)

      result.success = error ? 0 : ids.length
      result.failed = error ? ids.length : 0
      if (error) result.errors.push(error.message)
    }

    // Bulk delete drafts
    else if (action === 'delete') {
      const { error } = await supabase
        .from('draft_replies')
        .delete()
        .in('id', ids)

      result.success = error ? 0 : ids.length
      result.failed = error ? ids.length : 0
      if (error) result.errors.push(error.message)
    }

    // Bulk mark emails as processed
    else if (action === 'mark-processed') {
      const { error } = await supabase
        .from('email_logs')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', ids)

      result.success = error ? 0 : ids.length
      result.failed = error ? ids.length : 0
      if (error) result.errors.push(error.message)
    }

    // Bulk update priority
    else if (action === 'update-priority') {
      const { error } = await supabase
        .from('email_logs')
        .update({ priority: data?.priority || 'normal' })
        .in('id', ids)

      result.success = error ? 0 : ids.length
      result.failed = error ? ids.length : 0
      if (error) result.errors.push(error.message)
    }

    // Bulk add tags (stored in metadata)
    else if (action === 'add-tags') {
      const tags = data?.tags || []
      
      for (const id of ids) {
        const { data: existing } = await supabase
          .from('email_logs')
          .select('metadata')
          .eq('id', id)
          .single()

        const currentMetadata = existing?.metadata || {}
        const currentTags = currentMetadata.tags || []
        const updatedTags = [...new Set([...currentTags, ...tags])]

        const { error } = await supabase
          .from('email_logs')
          .update({ metadata: { ...currentMetadata, tags: updatedTags } })
          .eq('id', id)

        if (error) {
          result.failed += 1
          result.errors.push({ id, error: error.message })
        } else {
          result.success += 1
        }
      }
    }

    // Bulk archive conversations
    else if (action === 'archive') {
      const { error } = await supabase
        .from('summaries')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .in('id', ids)

      result.success = error ? 0 : ids.length
      result.failed = error ? ids.length : 0
      if (error) result.errors.push(error.message)
    }

    // Bulk send approved drafts
    else if (action === 'send-approved') {
      // This is a placeholder - actual sending would need OpenPhone API integration
      // For now, we'll just mark them as sent
      const { error } = await supabase
        .from('draft_replies')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('status', 'approved')

      result.success = error ? 0 : ids.length
      result.failed = error ? ids.length : 0
      if (error) result.errors.push(error.message)
    }

    else {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Bulk action failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})