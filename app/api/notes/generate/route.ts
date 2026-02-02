import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_name, appointment_date, template_name, sections, prompt_content, uploaded_text } = body;

    if (!patient_name || !template_name) {
      return NextResponse.json({ ok: false, error: 'Patient name and template are required' }, { status: 400 });
    }

    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityKey) {
      // Return mock response if no API key
      const mockContent = `# ${template_name}\n\n**Patient:** ${patient_name}\n**Date:** ${appointment_date}\n\n` +
        (sections || []).map((section: string) => `## ${section}\n\n[AI-generated content for ${section} would appear here]\n`).join('\n');
      
      return NextResponse.json({ ok: true, generated_content: mockContent, mock: true });
    }

    // Build the prompt
    const systemPrompt = prompt_content || `You are a medical documentation assistant. Generate professional clinical notes based on the provided information.`;
    
    const userPrompt = `Generate a ${template_name} for patient ${patient_name}, dated ${appointment_date}.
    
${sections ? `The note should include these sections: ${sections.join(', ')}` : ''}

${uploaded_text ? `Based on the following transcript/notes:\n${uploaded_text}` : 'Generate appropriate placeholder content for each section.'}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error('Failed to generate note');
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ ok: true, generated_content: generatedContent });
  } catch (error: any) {
    console.error('Error generating note:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
