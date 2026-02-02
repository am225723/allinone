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

    const now = new Date()
    const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

    const { count: notesPending } = await supabase
      .from('clinical_notes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft')

    const { count: totalNotes } = await supabase
      .from('clinical_notes')
      .select('*', { count: 'exact', head: true })

    const payload = {
      notesPending: notesPending || 0,
      totalNotes: totalNotes || 0,
      appointmentsThisWeek: 14,
      appointmentsToday: 3,
      topIcd10: [
        { code: 'F41.1', label: 'Generalized anxiety disorder', count: 5 },
        { code: 'F33.1', label: 'Major depressive disorder, recurrent', count: 3 },
        { code: 'F90.0', label: 'ADHD, predominantly inattentive', count: 2 },
      ],
      appointmentsTodayList: {
        dateLabel: today,
        items: [
          { time: '9:00 AM', patient: 'Alex Morgan', type: 'Follow-up' },
          { time: '11:30 AM', patient: 'Jordan Lee', type: 'Initial Intake' },
          { time: '3:15 PM', patient: 'Sam Patel', type: 'Medication Mgmt' },
        ],
      },
    }

    return new Response(
      JSON.stringify({ ok: true, stats: payload }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching patient stats:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to fetch stats' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
