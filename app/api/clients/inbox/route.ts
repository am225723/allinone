import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, status = 'new' } = body;
    
    let query = supabaseServer
      .from('inbound_identity_events')
      .select('*', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false });
      
    if (source) {
      query = query.eq('source', source);
    }
    
    const { data: events, error, count } = await query;
    
    if (error) {
      console.error('Error fetching inbox:', error);
      return NextResponse.json({ ok: false, error: 'Failed to fetch inbox' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      ok: true, 
      events: events || [],
      total: count || 0
    });
  } catch (err) {
    console.error('Error in inbox route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}
