import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callPerplexityAPI(prompt: string) {
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
        {
          role: 'system',
          content: 'You are a task management assistant. Provide helpful suggestions for task management. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 1000,
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

    const { action, task_id, title, description, context } = await req.json()

    let result: any

    switch (action) {
      case 'suggest-subtasks': {
        const prompt = `Given the following task, suggest 3-5 actionable subtasks to complete it:

Task Title: ${title}
${description ? `Description: ${description}` : ''}

Respond in JSON format:
{
  "subtasks": [
    {"title": "Subtask 1", "estimated_minutes": 30},
    {"title": "Subtask 2", "estimated_minutes": 15}
  ]
}`

        const response = await callPerplexityAPI(prompt)
        try {
          result = JSON.parse(response)
        } catch {
          result = { subtasks: [], raw: response }
        }
        break
      }

      case 'estimate-time': {
        const prompt = `Estimate the time required to complete this task:

Task Title: ${title}
${description ? `Description: ${description}` : ''}

Respond in JSON format:
{
  "estimated_minutes": 60,
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation"
}`

        const response = await callPerplexityAPI(prompt)
        try {
          result = JSON.parse(response)
        } catch {
          result = { estimated_minutes: 30, confidence: 'low', reasoning: response }
        }
        break
      }

      case 'prioritize': {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, description, priority, due_date, status')
          .in('status', ['pending', 'in_progress'])
          .limit(20)

        const taskList = tasks?.map(t => 
          `- ${t.title} (Priority: ${t.priority}, Due: ${t.due_date || 'No date'})`
        ).join('\n')

        const prompt = `Given these tasks, suggest an optimal priority order:

${taskList}

Respond in JSON format:
{
  "prioritized_order": [
    {"id": "task-id", "suggested_priority": "high|medium|low", "reason": "Brief reason"}
  ],
  "recommendations": ["General recommendation 1", "General recommendation 2"]
}`

        const response = await callPerplexityAPI(prompt)
        try {
          result = JSON.parse(response)
        } catch {
          result = { prioritized_order: [], recommendations: [response] }
        }
        break
      }

      case 'generate-description': {
        const prompt = `Generate a detailed description for this task:

Task Title: ${title}
${context ? `Context: ${context}` : ''}

Respond in JSON format:
{
  "description": "Detailed task description",
  "acceptance_criteria": ["Criterion 1", "Criterion 2"]
}`

        const response = await callPerplexityAPI(prompt)
        try {
          result = JSON.parse(response)
        } catch {
          result = { description: response, acceptance_criteria: [] }
        }
        break
      }

      default:
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
    console.error('Error in tasks-ai function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'AI operation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
