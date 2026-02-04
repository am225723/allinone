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
    
    if (body.contactId) {
      return handleUpdate(body);
    } else {
      return handleAdd(body);
    }
  } catch (err) {
    console.error('Error in contacts route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}

async function handleAdd(body: any) {
  const { clientId, type, value, label, isPrimary } = body;
  
  if (!clientId || !type || !value) {
    return NextResponse.json({ ok: false, error: 'Client ID, type, and value are required' }, { status: 400 });
  }
  
  if (!['phone', 'email'].includes(type)) {
    return NextResponse.json({ ok: false, error: 'Type must be phone or email' }, { status: 400 });
  }
  
  const normalizedValue = type === 'phone' ? normalizePhone(value) : value.toLowerCase().trim();
  
  if (isPrimary) {
    await supabaseServer
      .from('client_contacts')
      .update({ is_primary: false })
      .eq('client_id', clientId)
      .eq('type', type);
  }
  
  const { data: contact, error } = await supabaseServer
    .from('client_contacts')
    .insert({
      client_id: clientId,
      type,
      value: normalizedValue,
      label: label || null,
      is_primary: isPrimary || false,
      source: 'manual'
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error adding contact:', error);
    if (error.code === '23505') {
      return NextResponse.json({ ok: false, error: 'Contact already exists' }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to add contact' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, contact });
}

async function handleUpdate(body: any) {
  const { contactId, isPrimary, label } = body;
  
  if (!contactId) {
    return NextResponse.json({ ok: false, error: 'Contact ID is required' }, { status: 400 });
  }
  
  const { data: existingContact, error: fetchError } = await supabaseServer
    .from('client_contacts')
    .select('client_id, type')
    .eq('id', contactId)
    .single();
    
  if (fetchError || !existingContact) {
    return NextResponse.json({ ok: false, error: 'Contact not found' }, { status: 404 });
  }
  
  if (isPrimary) {
    await supabaseServer
      .from('client_contacts')
      .update({ is_primary: false })
      .eq('client_id', existingContact.client_id)
      .eq('type', existingContact.type);
  }
  
  const updateData: any = { updated_at: new Date().toISOString() };
  if (isPrimary !== undefined) updateData.is_primary = isPrimary;
  if (label !== undefined) updateData.label = label;
  
  const { data: contact, error } = await supabaseServer
    .from('client_contacts')
    .update(updateData)
    .eq('id', contactId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update contact' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, contact });
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId } = body;
    
    if (!contactId) {
      return NextResponse.json({ ok: false, error: 'Contact ID is required' }, { status: 400 });
    }
    
    const { error } = await supabaseServer
      .from('client_contacts')
      .delete()
      .eq('id', contactId);
      
    if (error) {
      console.error('Error deleting contact:', error);
      return NextResponse.json({ ok: false, error: 'Failed to delete contact' }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error in contacts delete route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}
