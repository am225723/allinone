/**
 * API Route: Search
 * @vercel Edge Runtime enabled
 */

import { NextResponse } from 'next/server';
import { searchCommunications, getSearchSuggestions, SearchParams } from '@/lib/search';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const params: SearchParams = await request.json();
    
    // Convert date strings to Date objects if present
    if (params.dateRange) {
      params.dateRange = {
        start: new Date(params.dateRange.start),
        end: new Date(params.dateRange.end),
      };
    }

    const results = await searchCommunications(params);
    
    return NextResponse.json({ ok: true, results, count: results.length });
  } catch (error: any) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    if (query.length < 2) {
      return NextResponse.json({ ok: true, suggestions: [] });
    }

    const suggestions = await getSearchSuggestions(query);
    
    return NextResponse.json({ ok: true, suggestions });
  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}