/**
 * AI Services - Perplexity API Only
 * Handles AI-powered analysis for both OpenPhone and Gmail using Perplexity API
 */

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Perplexity API configuration
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Model selection based on task complexity
const MODELS = {
  // Lightweight - fast, cost-effective for simple tasks
  LIGHTWEIGHT: 'sonar',
  // Advanced - good for complex analysis
  ADVANCED: 'sonar-pro',
  // Deep Research - comprehensive analysis with citations
  DEEP_RESEARCH: 'sonar-deep-research',
  // Reasoning - best for logic and inference
  REASONING: 'sonar-reasoning-pro',
};

/**
 * Call Perplexity API with the given messages and model
 */
async function callPerplexityAPI(
  messages: PerplexityMessage[],
  model: string = MODELS.ADVANCED,
  options: {
    temperature?: number;
    maxTokens?: number;
    disableSearch?: boolean;
    responseFormat?: { type: 'json_object' };
  } = {}
): Promise<string> {
  const apiKey = PERPLEXITY_API_KEY;
  
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  const {
    temperature = 0.3,
    maxTokens = 2000,
    disableSearch = false,
    responseFormat,
  } = options;

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        disable_search: disableSearch,
        ...(responseFormat && { response_format: responseFormat }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
    }

    const data: PerplexityResponse = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    return content;
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    throw error;
  }
}

/**
 * Parse JSON from Perplexity response (handles markdown code blocks)
 */
function parseJSONResponse(content: string): any {
  try {
    // Try direct JSON parsing first
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // If still fails, return a safe fallback
        return {};
      }
    }
    // Return a safe fallback
    return {};
  }
}

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
    const content = await callPerplexityAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      MODELS.LIGHTWEIGHT,
      {
        temperature: 0.3,
        disableSearch: true, // No need for web search for email analysis
        responseFormat: { type: 'json_object' },
      }
    );

    return parseJSONResponse(content);
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
    const content = await callPerplexityAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript.slice(0, 8000) },
      ],
      MODELS.LIGHTWEIGHT,
      {
        temperature: 0.3,
        disableSearch: true,
        responseFormat: { type: 'json_object' },
      }
    );

    const parsed = parseJSONResponse(content);
    
    // Ensure required fields exist
    return {
      summary: parsed.summary || 'Unable to summarize conversation',
      topics: parsed.topics || [],
      needsResponse: parsed.needsResponse ?? false,
      dateRange: parsed.dateRange || '',
      draftReply: parsed.draftReply || null,
      explicitName: parsed.explicitName || null,
    };
  } catch (error) {
    console.error('Error summarizing conversation:', error);
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
 * Extract explicit name from transcript (rule-based fallback)
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
    const content = await callPerplexityAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      MODELS.LIGHTWEIGHT,
      {
        temperature: 0.5,
        disableSearch: true,
      }
    );

    return content || originalDraft;
  } catch (error) {
    console.error('Error rewriting draft:', error);
    return originalDraft;
  }
}

/**
 * Generate multiple draft reply variations with different tones
 */
export async function generateDraftVariations(
  originalMessage: string,
  context?: string
): Promise<{ tone: string; draft: string }[]> {
  const tones = [
    'professional',
    'friendly',
    'concise',
    'empathetic',
  ];

  const systemPrompt = `You are a communication assistant. Generate a draft reply with a specific tone. The draft should be appropriate for the context and address the original message effectively.`;

  const userPromptTemplate = context
    ? `Context: ${context}\n\nOriginal message:\n${originalMessage}\n\nGenerate a {tone} reply.`
    : `Original message:\n${originalMessage}\n\nGenerate a {tone} reply.`;

  const variations: { tone: string; draft: string }[] = [];

  for (const tone of tones) {
    try {
      const tonePrompt = userPromptTemplate.replace('{tone}', tone);
      const content = await callPerplexityAPI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: tonePrompt },
        ],
        MODELS.LIGHTWEIGHT,
        {
          temperature: 0.7,
          disableSearch: true,
        }
      );

      if (content) {
        variations.push({ tone, draft: content });
      }
    } catch (error) {
      console.error(`Error generating ${tone} draft:`, error);
    }
  }

  return variations;
}

/**
 * Analyze sentiment of a message
 */
export async function analyzeSentiment(message: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: string[];
}> {
  const systemPrompt = `You are a sentiment analysis expert. Analyze the message and provide:
1. Overall sentiment (positive/negative/neutral)
2. Confidence score (0-1)
3. Key emotions detected

Respond in JSON format:
{
  "sentiment": "positive/negative/neutral",
  "confidence": 0.95,
  "emotions": ["happiness", "excitement", ...]
}`;

  try {
    const content = await callPerplexityAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.slice(0, 2000) },
      ],
      MODELS.LIGHTWEIGHT,
      {
        temperature: 0.2,
        disableSearch: true,
        responseFormat: { type: 'json_object' },
      }
    );

    const parsed = parseJSONResponse(content);
    
    return {
      sentiment: parsed.sentiment || 'neutral',
      confidence: parsed.confidence || 0.5,
      emotions: parsed.emotions || [],
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      emotions: [],
    };
  }
}

/**
 * Extract key topics and entities from a conversation
 */
export async function extractTopicsAndEntities(text: string): Promise<{
  topics: string[];
  entities: { name: string; type: string }[];
  keywords: string[];
}> {
  const systemPrompt = `You are a text analysis expert. Extract and categorize information from the text:
1. Main topics discussed
2. Named entities (people, organizations, locations, dates)
3. Important keywords

Respond in JSON format:
{
  "topics": ["topic1", "topic2"],
  "entities": [{"name": "John Doe", "type": "person"}, {"name": "Google", "type": "organization"}],
  "keywords": ["keyword1", "keyword2"]
}`;

  try {
    const content = await callPerplexityAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text.slice(0, 3000) },
      ],
      MODELS.ADVANCED,
      {
        temperature: 0.3,
        disableSearch: true,
        responseFormat: { type: 'json_object' },
      }
    );

    const parsed = parseJSONResponse(content);
    
    return {
      topics: parsed.topics || [],
      entities: parsed.entities || [],
      keywords: parsed.keywords || [],
    };
  } catch (error) {
    console.error('Error extracting topics:', error);
    return {
      topics: [],
      entities: [],
      keywords: [],
    };
  }
}

/**
 * Generate follow-up questions for a conversation
 */
export async function generateFollowUpQuestions(conversation: string, count: number = 3): Promise<string[]> {
  const systemPrompt = `You are a conversation assistant. Generate relevant follow-up questions based on the conversation. The questions should be natural, helpful, and encourage further dialogue.`;

  try {
    const content = await callPerplexityAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} follow-up questions for this conversation:\n\n${conversation.slice(0, 3000)}` },
      ],
      MODELS.LIGHTWEIGHT,
      {
        temperature: 0.7,
        disableSearch: true,
      }
    );

    // Parse the response into a list of questions
    const questions = content
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0 && line.includes('?'));

    return questions.slice(0, count);
  } catch (error) {
    console.error('Error generating follow-up questions:', error);
    return [];
  }
}