import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import Papa from 'papaparse';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MRN_QUERY_CHUNK_SIZE = 200;
const CONTACT_INSERT_CHUNK_SIZE = 200;

type CsvRow = Record<string, any>;

type PendingContact = {
  client_id: string;
  type: 'phone' | 'email';
  value: string;
  label: string | null;
  is_primary: boolean;
  source: 'import';
};

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
    }
    if (cleanedPhone.length === 11 && cleanedPhone.startsWith('1')) {
      return `+${cleanedPhone}`;
    }

    return phone.trim() || null;
  } catch {
    return phone.trim() || null;
  }
}

function parseCSV(csvText: string): CsvRow[] {
  try {
    const result = Papa.parse<CsvRow>(csvText, {
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

function getFieldValue(row: CsvRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function chunkArray<T>(input: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}

async function fetchExistingClientMapByMrn(mrns: string[]): Promise<Map<string, string>> {
  const clientMap = new Map<string, string>();
  if (mrns.length === 0) return clientMap;

  const mrnChunks = chunkArray(mrns, MRN_QUERY_CHUNK_SIZE);

  for (const chunk of mrnChunks) {
    const { data, error } = await supabaseServer
      .from('clients')
      .select('id,mrn')
      .in('mrn', chunk);

    if (error) {
      throw error;
    }

    for (const client of data || []) {
      if (client.mrn) {
        clientMap.set(client.mrn, client.id);
      }
    }
  }

  return clientMap;
}

async function insertContactsInChunks(contacts: PendingContact[]): Promise<void> {
  if (contacts.length === 0) return;

  const chunks = chunkArray(contacts, CONTACT_INSERT_CHUNK_SIZE);

  for (const chunk of chunks) {
    const { error } = await supabaseServer
      .from('client_contacts')
      .upsert(chunk, { onConflict: 'type,value', ignoreDuplicates: true });

    if (!error) continue;

    // Fallback to row-level inserts to isolate bad rows while still completing import.
    for (const contact of chunk) {
      const { error: singleError } = await supabaseServer
        .from('client_contacts')
        .upsert(contact, { onConflict: 'type,value', ignoreDuplicates: true });

      if (singleError) {
        console.error('Error inserting contact during import:', singleError.message);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const csvText = typeof body.csvText === 'string' ? body.csvText : '';
    const updateMatchesByMrn = Boolean(body.updateMatchesByMrn);

    if (!csvText.trim()) {
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
      errors: 0,
    };

    const allMrns = updateMatchesByMrn
      ? Array.from(
          new Set(
            rows
              .map((row) => getFieldValue(row, 'mrn', 'MRN', 'medical_record_number'))
              .filter((mrn): mrn is string => Boolean(mrn))
          )
        )
      : [];

    const existingClientsByMrn = await fetchExistingClientMapByMrn(allMrns);
    const pendingContacts: PendingContact[] = [];

    for (const row of rows) {
      const firstName = getFieldValue(row, 'firstName', 'first_name', 'firstname', 'First Name');
      const lastName = getFieldValue(row, 'lastName', 'last_name', 'lastname', 'Last Name');

      if (!firstName || !lastName) {
        summary.skipped++;
        continue;
      }

      try {
        const mrn = getFieldValue(row, 'mrn', 'MRN', 'medical_record_number');
        const existingClientId = updateMatchesByMrn && mrn ? existingClientsByMrn.get(mrn) : undefined;

        const clientData = {
          first_name: firstName,
          last_name: lastName,
          preferred_name: getFieldValue(row, 'preferredName', 'preferred_name', 'nickname', 'Preferred Name'),
          dob: getFieldValue(row, 'dob', 'date_of_birth', 'Date of Birth'),
          mrn: getFieldValue(row, 'mrn', 'medical_record_number', 'MRN'),
          status: getFieldValue(row, 'status', 'Status') || 'active',
          address_line1: getFieldValue(row, 'addressLine1', 'address_line1', 'address', 'Address Line 1', 'Address'),
          address_line2: getFieldValue(row, 'addressLine2', 'address_line2', 'Address Line 2'),
          city: getFieldValue(row, 'city', 'City'),
          state: getFieldValue(row, 'state', 'State'),
          zip: getFieldValue(row, 'zip', 'zip_code', 'Zip', 'Zip Code'),
          insurance_provider: getFieldValue(row, 'insuranceProvider', 'insurance_provider', 'Insurance Provider'),
          insurance_member_id: getFieldValue(row, 'insuranceMemberId', 'insurance_member_id', 'Insurance Member ID'),
          emergency_contact_name: getFieldValue(row, 'emergencyContactName', 'emergency_contact_name', 'Emergency Contact Name'),
          emergency_contact_phone: getFieldValue(row, 'emergencyContactPhone', 'emergency_contact_phone', 'Emergency Contact Phone'),
          updated_at: new Date().toISOString(),
        };

        let clientId: string;
        const isExistingClient = Boolean(existingClientId);

        if (isExistingClient && existingClientId) {
          const { error } = await supabaseServer
            .from('clients')
            .update(clientData)
            .eq('id', existingClientId);

          if (error) throw error;

          clientId = existingClientId;
          summary.updated++;
        } else {
          const { data: newClient, error } = await supabaseServer
            .from('clients')
            .insert(clientData)
            .select('id,mrn')
            .single();

          if (error) throw error;

          clientId = newClient.id;
          summary.created++;

          if (newClient.mrn) {
            existingClientsByMrn.set(newClient.mrn, newClient.id);
          }
        }

        const contacts: PendingContact[] = [];
        const addPrimary = !isExistingClient;

        const phone1 = getFieldValue(row, 'phone', 'Phone');
        const phone2 = getFieldValue(row, 'phone2', 'phone_2', 'Phone2', 'Phone 2');
        const email1 = getFieldValue(row, 'email', 'Email');
        const email2 = getFieldValue(row, 'email2', 'email_2', 'Email2', 'Email 2');

        const normalizedPhone1 = phone1 ? normalizePhone(phone1) : null;
        const normalizedPhone2 = phone2 ? normalizePhone(phone2) : null;
        const normalizedEmail1 = email1 ? email1.toLowerCase().trim() : null;
        const normalizedEmail2 = email2 ? email2.toLowerCase().trim() : null;

        if (normalizedPhone1) {
          contacts.push({
            client_id: clientId,
            type: 'phone',
            value: normalizedPhone1,
            label: getFieldValue(row, 'phoneLabel', 'Phone Label', 'Phone Label 1') || null,
            is_primary: addPrimary,
            source: 'import',
          });
        }

        if (normalizedPhone2) {
          contacts.push({
            client_id: clientId,
            type: 'phone',
            value: normalizedPhone2,
            label: getFieldValue(row, 'phone2Label', 'Phone Label 2') || null,
            is_primary: false,
            source: 'import',
          });
        }

        if (normalizedEmail1) {
          contacts.push({
            client_id: clientId,
            type: 'email',
            value: normalizedEmail1,
            label: getFieldValue(row, 'emailLabel', 'Email Label', 'Email Label 1') || null,
            is_primary: addPrimary,
            source: 'import',
          });
        }

        if (normalizedEmail2) {
          contacts.push({
            client_id: clientId,
            type: 'email',
            value: normalizedEmail2,
            label: getFieldValue(row, 'email2Label', 'Email Label 2') || null,
            is_primary: false,
            source: 'import',
          });
        }

        if (contacts.length > 0) {
          pendingContacts.push(...contacts);
        }
      } catch (err) {
        console.error('Error processing import row:', err);
        summary.errors++;
      }
    }

    await insertContactsInChunks(pendingContacts);

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error('Error in import route:', err);
    return NextResponse.json({ ok: false, error: 'Import failed' }, { status: 500 });
  }
}
