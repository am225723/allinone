import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    const apiKey = req.headers.get('x-api-key')
    const cronSecret = Deno.env.get('CRON_SECRET')
    const pushApiSecret = Deno.env.get('PUSH_API_SECRET')

    const isAuthorized = 
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (pushApiSecret && apiKey === pushApiSecret)

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID')
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

    if (!onesignalAppId || !onesignalApiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { 
      title, 
      message, 
      url, 
      player_ids, 
      include_external_user_ids,
      data 
    } = await req.json()

    if (!title || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: any = {
      app_id: onesignalAppId,
      headings: { en: title },
      contents: { en: message },
    }

    if (url) {
      payload.url = url
    }

    if (data) {
      payload.data = data
    }

    if (player_ids && player_ids.length > 0) {
      payload.include_player_ids = player_ids
    } else if (include_external_user_ids && include_external_user_ids.length > 0) {
      payload.include_external_user_ids = include_external_user_ids
    } else {
      payload.included_segments = ['All']
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${onesignalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.errors?.[0] || 'Failed to send notification')
    }

    return new Response(
      JSON.stringify({ ok: true, notification_id: result.id, recipients: result.recipients }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in push-send function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to send notification' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
