import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

async function callPerplexity(prompt: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful task management assistant. Be concise and direct.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    const { action, title, description } = await request.json();

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({ 
        ok: false, 
        error: 'AI service not configured' 
      }, { status: 500 });
    }

    if (action === 'suggest_priority') {
      const prompt = `Based on this task title and description, suggest the appropriate priority level. 
      
Task: "${title}"
${description ? `Description: "${description}"` : ''}

Respond with ONLY one of these exact words: low, normal, high, urgent

Consider:
- "urgent" for time-sensitive, critical issues, emergencies, patient safety
- "high" for important deadlines, key deliverables, significant impact
- "normal" for regular work tasks, standard activities
- "low" for nice-to-have, no deadline, minor improvements`;

      const response = await callPerplexity(prompt);
      const priority = response.toLowerCase().trim();
      
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      const suggestedPriority = validPriorities.find(p => priority.includes(p)) || 'normal';

      return NextResponse.json({ 
        ok: true, 
        priority: suggestedPriority,
        reasoning: response 
      });
    }

    if (action === 'breakdown') {
      const prompt = `Break down this task into 5 actionable sub-tasks or checklist items.

Task: "${title}"
${description ? `Description: "${description}"` : ''}

Respond with exactly 5 numbered steps, each on a new line. Be specific and actionable. Format:
1. First step
2. Second step
3. Third step
4. Fourth step
5. Fifth step`;

      const response = await callPerplexity(prompt);
      
      const lines = response.split('\n').filter(line => line.trim());
      const checklist = lines
        .map(line => {
          const match = line.match(/^\d+[\.\)]\s*(.+)/);
          return match ? match[1].trim() : line.trim();
        })
        .filter(text => text.length > 0)
        .slice(0, 5)
        .map((text, index) => ({
          id: `item-${Date.now()}-${index}`,
          text,
          completed: false,
        }));

      return NextResponse.json({ 
        ok: true, 
        checklist 
      });
    }

    return NextResponse.json({ 
      ok: false, 
      error: 'Unknown action' 
    }, { status: 400 });
  } catch (error: any) {
    console.error('AI task error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
