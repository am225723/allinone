import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    const { data: contact } = await supabaseServer
      .from('client_contacts')
      .select('client_id')
      .eq('type', 'email')
      .eq('value', normalizedEmail)
      .single();
      
    if (contact) {
      return NextResponse.json({ 
        ok: true, 
        matched: true, 
        clientId: contact.client_id 
      });
    }
    
    const { data: existingEvent } = await supabaseServer
      .from('inbound_identity_events')
      .select('id')
      .eq('source', 'gmail')
      .eq('identifier', normalizedEmail)
      .eq('status', 'new')
      .single();
      
    if (!existingEvent) {
      const { data: newEvent, error: eventError } = await supabaseServer
        .from('inbound_identity_events')
        .insert({
          source: 'gmail',
          identifier: normalizedEmail,
          status: 'new'
        })
        .select('id')
        .single();
        
      if (eventError) {
        console.error('Error creating event:', eventError);
      }
      
      return NextResponse.json({ 
        ok: true, 
        matched: false, 
        eventId: newEvent?.id 
      });
    }
    
    return NextResponse.json({ 
      ok: true, 
      matched: false, 
      eventId: existingEvent.id 
    });
  } catch (err) {
    console.error('Error in gmail inbound route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}
