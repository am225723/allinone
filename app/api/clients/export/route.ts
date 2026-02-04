import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { status } = body;
    
    let query = supabaseServer
      .from('clients')
      .select(`
        *,
        client_contacts(type, value, label, is_primary)
      `)
      .order('last_name', { ascending: true });
      
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data: clients, error } = await query;
    
    if (error) {
      console.error('Error fetching clients for export:', error);
      return NextResponse.json({ ok: false, error: 'Failed to export clients' }, { status: 500 });
    }
    
    const headers = [
      'firstName', 'lastName', 'preferredName', 'dob', 'mrn', 'status',
      'phone', 'phoneLabel', 'phone2', 'phone2Label',
      'email', 'emailLabel', 'email2', 'email2Label',
      'addressLine1', 'addressLine2', 'city', 'state', 'zip',
      'insuranceProvider', 'insuranceMemberId',
      'emergencyContactName', 'emergencyContactPhone'
    ];
    
    const rows: string[][] = [];
    
    for (const client of clients || []) {
      const contacts = client.client_contacts || [];
      const phones = contacts.filter((c: any) => c.type === 'phone');
      const emails = contacts.filter((c: any) => c.type === 'email');
      
      const primaryPhone = phones.find((c: any) => c.is_primary) || phones[0];
      const secondaryPhone = phones.find((c: any) => !c.is_primary && c !== primaryPhone);
      const primaryEmail = emails.find((c: any) => c.is_primary) || emails[0];
      const secondaryEmail = emails.find((c: any) => !c.is_primary && c !== primaryEmail);
      
      const row = [
        client.first_name || '',
        client.last_name || '',
        client.preferred_name || '',
        client.dob || '',
        client.mrn || '',
        client.status || '',
        primaryPhone?.value || '',
        primaryPhone?.label || '',
        secondaryPhone?.value || '',
        secondaryPhone?.label || '',
        primaryEmail?.value || '',
        primaryEmail?.label || '',
        secondaryEmail?.value || '',
        secondaryEmail?.label || '',
        client.address_line_1 || '',
        client.address_line_2 || '',
        client.city || '',
        client.state || '',
        client.zip || '',
        client.insurance_provider || '',
        client.insurance_member_id || '',
        client.emergency_contact_name || '',
        client.emergency_contact_phone || ''
      ];
      
      rows.push(row);
    }
    
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');
    
    return NextResponse.json({ ok: true, csv, count: rows.length });
  } catch (err) {
    console.error('Error in export route:', err);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 500 });
  }
}
