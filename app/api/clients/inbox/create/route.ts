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
    const { eventId, client, makePrimary = true } = body;
    
    if (!eventId || !client || !client.firstName || !client.lastName) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Event ID and client with firstName and lastName are required' 
      }, { status: 400 });
    }
    
    const { data: event, error: eventError } = await supabaseServer
      .from('inbound_identity_events')
      .select('*')
      .eq('id', eventId)
      .single();
      
    if (eventError || !event) {
      return NextResponse.json({ ok: false, error: 'Event not found' }, { status: 404 });
    }
    
    const { data: newClient, error: clientError } = await supabaseServer
      .from('clients')
      .insert({
        first_name: client.firstName,
        last_name: client.lastName,
        preferred_name: client.preferredName || null,
        dob: client.dob || null,
        mrn: client.mrn || null,
        status: 'active'
      })
      .select()
      .single();
      
    if (clientError || !newClient) {
      console.error('Error creating client:', clientError);
      return NextResponse.json({ ok: false, error: 'Failed to create client' }, { status: 500 });
    }
    
    const contactType = event.source === 'quo' ? 'phone' : 'email';
    const contactValue = contactType === 'phone' 
      ? normalizePhone(event.identifier) 
      : event.identifier.toLowerCase().trim();
    
    const { error: contactError } = await supabaseServer
      .from('client_contacts')
      .insert({
        client_id: newClient.id,
        type: contactType,
        value: contactValue,
        is_primary: makePrimary,
        source: event.source
      });
      
    if (contactError) {
      console.error('Error creating contact:', contactError);
    }
    
    const { error: updateError } = await supabaseServer
      .from('inbound_identity_events')
      .update({ 
        status: 'created',
        linked_client_id: newClient.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', eventId);
      
    if (updateError) {
      console.error('Error updating event:', updateError);
    }
    
    return NextResponse.json({ ok: true, client: newClient });
  } catch (err) {
    console.error('Error in create route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}
