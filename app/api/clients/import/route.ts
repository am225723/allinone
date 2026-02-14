import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import Papa from 'papaparse';

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
  try {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^"|"$/g, ''),
    });
    
    return result.data || [];
  } catch (error) {
    console.error('CSV parsing error:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvText, updateMatchesByMrn = false } = body;
    
    if (!csvText) {
      return NextResponse.json({ ok: false, error: 'CSV text is required' }, { status: 400 });
    }
    
    const rows = parseCSV(csvText);
    
    console.log('Parsed rows:', rows.length);
    console.log('First row sample:', rows[0]);
    
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
      
      // Trim whitespace and check for empty values
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      
      if (!trimmedFirstName || !trimmedLastName) {
        console.log('Skipping row - Missing names:', row);
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
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          preferred_name: (row.preferredName || row.preferred_name || null)?.trim() || null,
          dob: row.dob?.trim() || null,
          mrn: (mrn || '')?.trim() || null,
          status: (row.status || 'active').trim(),
          address_line_1: (row.addressLine1 || row.address_line_1 || null)?.trim() || null,
          address_line_2: (row.addressLine2 || row.address_line_2 || null)?.trim() || null,
          city: (row.city || null)?.trim() || null,
          state: (row.state || null)?.trim() || null,
          zip: (row.zip || null)?.trim() || null,
          insurance_provider: (row.insuranceProvider || row.insurance_provider || null)?.trim() || null,
          insurance_member_id: (row.insuranceMemberId || row.insurance_member_id || null)?.trim() || null,
          emergency_contact_name: (row.emergencyContactName || row.emergency_contact_name || null)?.trim() || null,
          emergency_contact_phone: (row.emergencyContactPhone || row.emergency_contact_phone || null)?.trim() || null,
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
        
        if (row.phone?.trim()) {
          contacts.push({ type: 'phone', value: row.phone.trim(), label: row.phoneLabel?.trim(), isPrimary: true });
        }
        if (row.phone2?.trim()) {
          contacts.push({ type: 'phone', value: row.phone2.trim(), label: row.phone2Label?.trim(), isPrimary: false });
        }
        if (row.email?.trim()) {
          contacts.push({ type: 'email', value: row.email.trim(), label: row.emailLabel?.trim(), isPrimary: true });
        }
        if (row.email2?.trim()) {
          contacts.push({ type: 'email', value: row.email2.trim(), label: row.email2Label?.trim(), isPrimary: false });
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
