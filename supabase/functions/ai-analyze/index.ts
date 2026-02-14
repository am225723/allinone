import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Perplexity API integration
async function callPerplexityAPI(prompt: string, model: string = 'sonar') {
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
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant. Provide concise, accurate responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
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
    const { action, text, context } = await req.json()

    let result: any

    switch (action) {
      case 'sentiment': {
        const prompt = `Analyze the sentiment of the following text. Provide:
1. Overall sentiment (positive, negative, or neutral)
2. Confidence score (0-100)
3. Main emotion detected
4. Brief explanation

Text: ${text}

Respond in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 85,
  "emotion": "happy|sad|angry|excited|worried|etc",
  "explanation": "Brief explanation"
}`

        const response = await callPerplexityAPI(prompt, 'sonar')
        
        try {
          result = JSON.parse(response)
        } catch {
          result = {
            sentiment: 'neutral',
            confidence: 50,
            emotion: 'unknown',
            explanation: response || 'Could not parse response'
          }
        }
        break
      }

      case 'topics': {
        const prompt = `Extract topics and entities from the following text. Provide:
1. Main topics (3-5)
2. Named entities (people, organizations, locations)
3. Keywords (5-10)

Text: ${text}

Respond in JSON format:
{
  "topics": ["topic1", "topic2", ...],
  "entities": [
    {"type": "person|organization|location", "name": "name"}
  ],
  "keywords": ["keyword1", "keyword2", ...]
}`

        const response = await callPerplexityAPI(prompt, 'sonar')
        
        try {
          result = JSON.parse(response)
        } catch {
          result = {
            topics: [],
            entities: [],
            keywords: [],
            raw: response || 'Could not parse response'
          }
        }
        break
      }

      case 'follow-up': {
        const prompt = `Generate 3 follow-up questions based on the following text. The questions should be relevant, clarifying, or probing deeper into the topic.

Text: ${text}

Respond in JSON format:
{
  "questions": [
    "question1",
    "question2",
    "question3"
  ]
}`

        const response = await callPerplexityAPI(prompt, 'sonar')
        
        try {
          const parsed = JSON.parse(response)
          result = parsed.questions || []
        } catch {
          result = response.split('\n').filter(q => q.trim()).slice(0, 3)
        }
        break
      }

      case 'draft-variations': {
        const tone = context?.tone || 'professional'
        const prompt = `Generate 4 draft reply variations based on the following text. Each variation should have a different tone: professional, friendly, concise, and empathetic.

Original text: ${text}
${context?.additionalContext ? `Additional context: ${context.additionalContext}` : ''}

Respond in JSON format:
{
  "variations": [
    {"tone": "professional", "text": "Professional draft"},
    {"tone": "friendly", "text": "Friendly draft"},
    {"tone": "concise", "text": "Concise draft"},
    {"tone": "empathetic", "text": "Empathetic draft"}
  ]
}`

        const response = await callPerplexityAPI(prompt, 'sonar')
        
        try {
          const parsed = JSON.parse(response)
          result = parsed.variations || []
        } catch {
          result = [
            { tone: 'professional', text: response || 'Could not generate variation' }
          ]
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
    console.error('Error performing AI analysis:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'AI analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})