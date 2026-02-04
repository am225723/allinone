import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    if (isListRequest(body)) {
      return handleList(body);
    } else if (body.id && !body.firstName && !body.lastName && body.notesInternal === undefined) {
      return handleGet(body);
    } else if (body.id) {
      return handleUpdate(body);
    } else {
      return handleCreate(body);
    }
  } catch (err) {
    console.error('Error in clients route:', err);
    return NextResponse.json({ ok: false, error: 'Request failed' }, { status: 500 });
  }
}

function isListRequest(body: any): boolean {
  return (
    body.hasOwnProperty('search') ||
    body.hasOwnProperty('status') ||
    body.hasOwnProperty('sort') ||
    body.hasOwnProperty('page') ||
    body.hasOwnProperty('pageSize')
  ) && !body.id && !body.firstName;
}

async function handleGet(body: any) {
  const { id } = body;
  
  const { data: client, error } = await supabaseServer
    .from('clients')
    .select(`
      *,
      client_contacts(id, type, value, label, is_primary, is_verified, source)
    `)
    .eq('id', id)
    .single();
    
  if (error) {
    return NextResponse.json({ ok: false, error: 'Client not found' }, { status: 404 });
  }
  
  return NextResponse.json({ ok: true, client });
}

async function handleCreate(body: any) {
  const { firstName, lastName, preferredName, dob, mrn } = body;
  
  if (!firstName || !lastName) {
    return NextResponse.json({ ok: false, error: 'First name and last name are required' }, { status: 400 });
  }
  
  const { data: client, error } = await supabaseServer
    .from('clients')
    .insert({
      first_name: firstName,
      last_name: lastName,
      preferred_name: preferredName || null,
      dob: dob || null,
      mrn: mrn || null,
      status: 'active'
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create client' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, client });
}

async function handleUpdate(body: any) {
  const { id, notesInternal, ...updates } = body;
  
  const updateData: any = {};
  if (updates.firstName) updateData.first_name = updates.firstName;
  if (updates.lastName) updateData.last_name = updates.lastName;
  if (updates.preferredName !== undefined) updateData.preferred_name = updates.preferredName || null;
  if (updates.dob !== undefined) updateData.dob = updates.dob || null;
  if (updates.mrn !== undefined) updateData.mrn = updates.mrn || null;
  if (notesInternal !== undefined) updateData.notes_internal = notesInternal;
  if (updates.addressLine1 !== undefined) updateData.address_line_1 = updates.addressLine1 || null;
  if (updates.addressLine2 !== undefined) updateData.address_line_2 = updates.addressLine2 || null;
  if (updates.city !== undefined) updateData.city = updates.city || null;
  if (updates.state !== undefined) updateData.state = updates.state || null;
  if (updates.zip !== undefined) updateData.zip = updates.zip || null;
  if (updates.insuranceProvider !== undefined) updateData.insurance_provider = updates.insuranceProvider || null;
  if (updates.insuranceMemberId !== undefined) updateData.insurance_member_id = updates.insuranceMemberId || null;
  if (updates.emergencyContactName !== undefined) updateData.emergency_contact_name = updates.emergencyContactName || null;
  if (updates.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = updates.emergencyContactPhone || null;
  
  updateData.updated_at = new Date().toISOString();
  
  const { data: client, error } = await supabaseServer
    .from('clients')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update client' }, { status: 500 });
  }
  
  return NextResponse.json({ ok: true, client });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'last_name';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    
    return handleList({ search, status, sort, page, pageSize });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch clients' }, { status: 500 });
  }
}

async function handleList(params: any) {
  const { search, status, sort, page, pageSize } = params;
  const offset = (page - 1) * pageSize;

  let query = supabaseServer
    .from('clients')
    .select(`
      *,
      client_contacts(id, type, value, label, is_primary, is_verified, source)
    `, { count: 'exact' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  } else {
    query = query.neq('status', 'archived');
  }

  if (search && search.trim()) {
    const searchTerm = search.trim().toLowerCase();
    query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,preferred_name.ilike.%${searchTerm}%,mrn.ilike.%${searchTerm}%`);
  }

  switch (sort) {
    case 'first_name':
      query = query.order('first_name', { ascending: true });
      break;
    case 'updated':
      query = query.order('updated_at', { ascending: false });
      break;
    case 'last_visit':
      query = query.order('last_visit_at', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order('last_name', { ascending: true });
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data: clients, error, count } = await query;

  if (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch clients' }, { status: 500 });
  }

  const clientsWithPrimary = (clients || []).map((client: any) => {
    const contacts = client.client_contacts || [];
    const primaryPhone = contacts.find((c: any) => c.type === 'phone' && c.is_primary);
    const primaryEmail = contacts.find((c: any) => c.type === 'email' && c.is_primary);
    const anyPhone = contacts.find((c: any) => c.type === 'phone');
    const anyEmail = contacts.find((c: any) => c.type === 'email');
    
    return {
      ...client,
      primary_phone: primaryPhone?.value || anyPhone?.value || null,
      primary_email: primaryEmail?.value || anyEmail?.value || null,
      contacts: contacts
    };
  });

  return NextResponse.json({ 
    ok: true, 
    clients: clientsWithPrimary,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  });
}
