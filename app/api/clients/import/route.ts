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

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^"|"$/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
}

function parseCSV(csvText: string): any[] {
  try {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^"|"$/g, ''),
    });
    
    const data = result.data || [];
    
    // Log parsing details
    console.log('CSV Parsing Details:');
    console.log('- Raw headers:', result.meta?.fields);
    console.log('- Number of rows parsed:', data.length);
    console.log('- First row sample:', data[0]);
    
    return data;
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
      // More flexible header matching
      const firstName = row.firstName || row.first_name || row.firstname || row['First Name'] || '';
      const lastName = row.lastName || row.last_name || row.lastname || row['Last Name'] || '';
      
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
        
        // Flexible field matching
        const getFieldValue = (...fields: (string | undefined)[]) => {
          for (const field of fields) {
            if (field && typeof field === 'string' && field.trim()) {
              return field.trim();
            }
          }
          return undefined;
        };

        const clientData = {
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          preferred_name: getFieldValue(row.preferredName, row.preferred_name, row.nickname, row['Preferred Name']),
          dob: getFieldValue(row.dob, row.date_of_birth, row['Date of Birth']),
          mrn: getFieldValue(mrn, row.medical_record_number, row['MRN']),
          status: getFieldValue(row.status, row.Status) || 'active',
          address_line_1: getFieldValue(row.addressLine1, row.address_line_1, row.address, row['Address Line 1'], row.Address),
          address_line_2: getFieldValue(row.addressLine2, row.address_line_2, row['Address Line 2']),
          city: getFieldValue(row.city, row.City),
          state: getFieldValue(row.state, row.State),
          zip: getFieldValue(row.zip, row.zip_code, row['Zip'], row['Zip Code']),
          insurance_provider: getFieldValue(row.insuranceProvider, row.insurance_provider, row['Insurance Provider']),
          insurance_member_id: getFieldValue(row.insuranceMemberId, row.insurance_member_id, row['Insurance Member ID']),
          emergency_contact_name: getFieldValue(row.emergencyContactName, row.emergency_contact_name, row['Emergency Contact Name']),
          emergency_contact_phone: getFieldValue(row.emergencyContactPhone, row.emergency_contact_phone, row['Emergency Contact Phone']),
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
        
        // Flexible phone field matching
        const phone1 = getFieldValue(row.phone, row.Phone, row['Phone']);
        const phone2 = getFieldValue(row.phone2, row.phone_2, row.Phone2, row['Phone 2']);
        const email1 = getFieldValue(row.email, row.Email, row['Email']);
        const email2 = getFieldValue(row.email2, row.email_2, row.Email2, row['Email 2']);
        
        if (phone1) {
          contacts.push({ type: 'phone', value: phone1, label: getFieldValue(row.phoneLabel, row['Phone Label'], row['Phone Label 1']), isPrimary: true });
        }
        if (phone2) {
          contacts.push({ type: 'phone', value: phone2, label: getFieldValue(row.phone2Label, row['Phone Label 2']), isPrimary: false });
        }
        if (email1) {
          contacts.push({ type: 'email', value: email1, label: getFieldValue(row.emailLabel, row['Email Label'], row['Email Label 1']), isPrimary: true });
        }
        if (email2) {
          contacts.push({ type: 'email', value: email2, label: getFieldValue(row.email2Label, row['Email Label 2']), isPrimary: false });
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
