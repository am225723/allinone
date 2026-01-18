/**
 * API Route: AI Analysis
 * Provides various AI-powered analysis features
 */

import { NextResponse } from 'next/server';
import {
  analyzeSentiment,
  extractTopicsAndEntities,
  generateFollowUpQuestions,
  generateDraftVariations,
} from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const { action, text, context } = await request.json();

    let result;

    switch (action) {
      case 'sentiment':
        result = await analyzeSentiment(text);
        break;

      case 'topics':
        result = await extractTopicsAndEntities(text);
        break;

      case 'follow-up':
        const count = 3;
        result = await generateFollowUpQuestions(text, count);
        break;

      case 'draft-variations':
        result = await generateDraftVariations(text, context);
        break;

      default:
        return NextResponse.json(
          { ok: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error('Error performing AI analysis:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'AI analysis failed' },
      { status: 500 }
    );
  }
}