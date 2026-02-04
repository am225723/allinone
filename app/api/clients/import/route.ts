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

function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvText, updateMatchesByMrn = false } = body;
    
    if (!csvText) {
      return NextResponse.json({ ok: false, error: 'CSV text is required' }, { status: 400 });
    }
    
    const rows = parseCSV(csvText);
    
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid rows found in CSV' }, { status: 400 });
    }
    
    const summary = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    for (const row of rows) {
      const firstName = row.firstName || row.first_name || '';
      const lastName = row.lastName || row.last_name || '';
      
      if (!firstName || !lastName) {
        summary.skipped++;
        continue;
      }
      
      try {
        const mrn = row.mrn || '';
        let existingClient = null;
        
        if (updateMatchesByMrn && mrn) {
          const { data } = await supabaseServer
            .from('clients')
            .select('id')
            .eq('mrn', mrn)
            .single();
          existingClient = data;
        }
        
        const clientData = {
          first_name: firstName,
          last_name: lastName,
          preferred_name: row.preferredName || row.preferred_name || null,
          dob: row.dob || null,
          mrn: mrn || null,
          status: row.status || 'active',
          address_line_1: row.addressLine1 || row.address_line_1 || null,
          address_line_2: row.addressLine2 || row.address_line_2 || null,
          city: row.city || null,
          state: row.state || null,
          zip: row.zip || null,
          insurance_provider: row.insuranceProvider || row.insurance_provider || null,
          insurance_member_id: row.insuranceMemberId || row.insurance_member_id || null,
          emergency_contact_name: row.emergencyContactName || row.emergency_contact_name || null,
          emergency_contact_phone: row.emergencyContactPhone || row.emergency_contact_phone || null,
          updated_at: new Date().toISOString()
        };
        
        let clientId: string;
        
        if (existingClient) {
          const { error } = await supabaseServer
            .from('clients')
            .update(clientData)
            .eq('id', existingClient.id);
            
          if (error) throw error;
          clientId = existingClient.id;
          summary.updated++;
        } else {
          const { data: newClient, error } = await supabaseServer
            .from('clients')
            .insert(clientData)
            .select('id')
            .single();
            
          if (error) throw error;
          clientId = newClient.id;
          summary.created++;
        }
        
        const contacts: { type: string; value: string; label?: string; isPrimary: boolean }[] = [];
        
        if (row.phone) {
          contacts.push({ type: 'phone', value: row.phone, label: row.phoneLabel, isPrimary: true });
        }
        if (row.phone2) {
          contacts.push({ type: 'phone', value: row.phone2, label: row.phone2Label, isPrimary: false });
        }
        if (row.email) {
          contacts.push({ type: 'email', value: row.email, label: row.emailLabel, isPrimary: true });
        }
        if (row.email2) {
          contacts.push({ type: 'email', value: row.email2, label: row.email2Label, isPrimary: false });
        }
        
        for (const contact of contacts) {
          const value = contact.type === 'phone' 
            ? normalizePhone(contact.value) 
            : contact.value.toLowerCase().trim();
            
          if (!value) continue;
          
          const { data: existing } = await supabaseServer
            .from('client_contacts')
            .select('id')
            .eq('client_id', clientId)
            .eq('value', value)
            .single();
            
          if (!existing) {
            await supabaseServer
              .from('client_contacts')
              .insert({
                client_id: clientId,
                type: contact.type,
                value,
                label: contact.label || null,
                is_primary: contact.isPrimary,
                source: 'import'
              });
          }
        }
      } catch (err) {
        console.error('Error processing row:', err);
        summary.errors++;
      }
    }
    
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error('Error in import route:', err);
    return NextResponse.json({ ok: false, error: 'Import failed' }, { status: 500 });
  }
}
