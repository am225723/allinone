/**
 * AI Services
 * Handles AI-powered analysis for both OpenPhone and Gmail
 */

import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

// Perplexity API for OpenPhone summaries
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

/**
 * Analyze email content and generate triage information
 */
export async function analyzeEmail(params: {
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  const { from, to, subject, body } = params;

  const systemPrompt = `You are an email triage assistant. Analyze the email and provide:
1. A brief summary (1-2 sentences)
2. Whether it needs a response (true/false)
3. Priority level (high/normal/low)
4. Suggested labels (up to 4)
5. If it needs a response, draft a professional reply

Respond in JSON format:
{
  "summary": "...",
  "needs_response": true/false,
  "priority": "high/normal/low",
  "proposed_labels": ["label1", "label2"],
  "draft_reply": "..." (only if needs_response is true)
}`;

  const userPrompt = `From: ${from}
To: ${to}
Subject: ${subject}

Body:
${body.slice(0, 3000)}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing email:', error);
    return {
      summary: 'Unable to analyze email',
      needs_response: false,
      priority: 'normal',
      proposed_labels: [],
      draft_reply: null,
    };
  }
}

/**
 * Summarize OpenPhone conversation for cleanup
 */
export async function summarizeForCleanup(transcript: string) {
  if (!PERPLEXITY_API_KEY) {
    // Fallback to OpenAI if Perplexity is not configured
    return summarizeWithOpenAI(transcript);
  }

  const systemPrompt = `You are a conversation analyst. Analyze the SMS conversation transcript and provide:
1. A brief summary of the conversation
2. Key topics discussed
3. Whether the conversation needs a response
4. The date range of the conversation
5. If a response is needed, draft a professional reply
6. Try to extract the person's name if mentioned

Respond in JSON format:
{
  "summary": "...",
  "topics": ["topic1", "topic2"],
  "needsResponse": true/false,
  "dateRange": "...",
  "draftReply": "..." (only if needsResponse is true),
  "explicitName": "..." (if found in conversation)
}`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript.slice(0, 8000) },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Try to parse as JSON, handle potential markdown code blocks
    let parsed;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[1] : content);
    } catch {
      parsed = {
        summary: content,
        topics: [],
        needsResponse: false,
        dateRange: '',
        draftReply: null,
        explicitName: null,
      };
    }

    return parsed;
  } catch (error) {
    console.error('Error with Perplexity API:', error);
    return summarizeWithOpenAI(transcript);
  }
}

/**
 * Fallback summarization using OpenAI
 */
async function summarizeWithOpenAI(transcript: string) {
  const systemPrompt = `You are a conversation analyst. Analyze the SMS conversation transcript and provide:
1. A brief summary of the conversation
2. Key topics discussed
3. Whether the conversation needs a response
4. The date range of the conversation
5. If a response is needed, draft a professional reply
6. Try to extract the person's name if mentioned

Respond in JSON format:
{
  "summary": "...",
  "topics": ["topic1", "topic2"],
  "needsResponse": true/false,
  "dateRange": "...",
  "draftReply": "..." (only if needsResponse is true),
  "explicitName": "..." (if found in conversation)
}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript.slice(0, 8000) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error summarizing with OpenAI:', error);
    return {
      summary: 'Unable to summarize conversation',
      topics: [],
      needsResponse: false,
      dateRange: '',
      draftReply: null,
      explicitName: null,
    };
  }
}

/**
 * Extract explicit name from transcript
 */
export function extractExplicitNameWithReason(transcript: string): { name: string; reason: string } | null {
  // Common patterns for name introduction
  const patterns = [
    /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:^|\n)\s*([A-Z][a-z]+)\s+here/i,
    /(?:regards|thanks|sincerely),?\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out common false positives
      const falsePositives = ['Thank', 'Thanks', 'Hi', 'Hello', 'Hey', 'Dear', 'Please'];
      if (!falsePositives.includes(name)) {
        return {
          name,
          reason: `Name extracted from pattern: "${match[0].trim()}"`,
        };
      }
    }
  }

  return null;
}

/**
 * Rewrite a draft reply
 */
export async function rewriteDraft(originalDraft: string, context?: string) {
  const systemPrompt = `You are a professional communication assistant. Rewrite the following draft message to be more professional, clear, and helpful while maintaining the same intent. Keep it concise.`;

  const userPrompt = context 
    ? `Context: ${context}\n\nOriginal draft:\n${originalDraft}`
    : `Original draft:\n${originalDraft}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content || originalDraft;
  } catch (error) {
    console.error('Error rewriting draft:', error);
    return originalDraft;
  }
}