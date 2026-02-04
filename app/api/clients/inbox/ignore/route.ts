import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;
    
    if (!eventId) {
      return NextResponse.json({ ok: false, error: 'Event ID is required' }, { status: 400 });
    }
    
    const { error } = await supabaseServer
      .from('inbound_identity_events')
      .update({ 
        status: 'ignored',
        resolved_at: new Date().toISOString()
      })
      .eq('id', eventId);
      
    if (error) {
      console.error('Error ignoring event:', error);
      return NextResponse.json({ ok: false, error: 'Failed to ignore event' }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in ignore route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}
