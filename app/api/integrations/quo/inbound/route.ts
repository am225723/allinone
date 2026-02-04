import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export const runtime = 'edge';

function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  try {
    const parsed = parsePhoneNumberFromString(phone, 'US' as CountryCode);
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length === 10) {
      return `+1${cleanedPhone}`;
    } else if (cleanedPhone.length === 11 && cleanedPhone.startsWith('1')) {
      return `+${cleanedPhone}`;
    }
    return phone;
  } catch {
    return phone;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;
    
    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Phone number is required' }, { status: 400 });
    }
    
    const normalizedPhone = normalizePhone(phone);
    
    const { data: contact } = await supabaseServer
      .from('client_contacts')
      .select('client_id')
      .eq('type', 'phone')
      .eq('value', normalizedPhone)
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
      .eq('source', 'quo')
      .eq('identifier', normalizedPhone)
      .eq('status', 'new')
      .single();
      
    if (!existingEvent) {
      const { data: newEvent, error: eventError } = await supabaseServer
        .from('inbound_identity_events')
        .insert({
          source: 'quo',
          identifier: normalizedPhone,
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
    console.error('Error in quo inbound route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}
