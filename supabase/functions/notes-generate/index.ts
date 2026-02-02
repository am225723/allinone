import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callPerplexityAPI(systemPrompt: string, userPrompt: string) {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Perplexity API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { template_id, prompt_id, patient_info, additional_context, uploaded_documents } = await req.json()

    let systemPrompt = 'You are a clinical documentation assistant. Generate professional clinical notes based on the provided information.'
    let templateStructure = ''

    if (prompt_id) {
      const { data: prompt } = await supabase
        .from('note_prompts')
        .select('*')
        .eq('id', prompt_id)
        .single()

      if (prompt) {
        systemPrompt = prompt.system_prompt || systemPrompt
      }
    }

    if (template_id) {
      const { data: template } = await supabase
        .from('note_templates')
        .select('*')
        .eq('id', template_id)
        .single()

      if (template) {
        templateStructure = template.structure || ''
      }
    }

    let userPrompt = `Generate a clinical note for the following patient:\n\n`
    
    if (patient_info) {
      userPrompt += `Patient Information:\n${JSON.stringify(patient_info, null, 2)}\n\n`
    }

    if (templateStructure) {
      userPrompt += `Use this template structure:\n${templateStructure}\n\n`
    }

    if (additional_context) {
      userPrompt += `Additional Context:\n${additional_context}\n\n`
    }

    if (uploaded_documents && uploaded_documents.length > 0) {
      userPrompt += `Reference Documents:\n`
      for (const doc of uploaded_documents) {
        userPrompt += `- ${doc.name}: ${doc.content || doc.summary || 'Document uploaded'}\n`
      }
      userPrompt += '\n'
    }

    userPrompt += 'Please generate a comprehensive, professional clinical note.'

    const generatedContent = await callPerplexityAPI(systemPrompt, userPrompt)

    return new Response(
      JSON.stringify({ ok: true, content: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating note:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Failed to generate note' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
