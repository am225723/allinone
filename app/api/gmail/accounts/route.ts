import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error, count } = await supabaseServer
      .from('gmail_accounts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error querying gmail_accounts:', error);
      return NextResponse.json({ accounts: [], error: error.message });
    }

    console.log(`gmail_accounts query returned ${data?.length || 0} rows (count: ${count})`);

    const accounts = (data || []).map(acc => ({
      id: acc.id,
      email: acc.email,
      name: acc.name || null,
      connected_at: acc.created_at,
      last_sync: acc.last_sync_at || acc.last_sync || acc.created_at,
      status: acc.is_active === false ? 'disconnected' : acc.access_token ? 'active' : 'error',
      is_active: acc.is_active !== false,
      sync_error: acc.sync_error || null,
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ accounts: [] });
  }
}
