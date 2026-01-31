import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('gmail_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ accounts: [] });
    }

    const accounts = (data || []).map(acc => ({
      id: acc.id,
      email: acc.email,
      connected_at: acc.created_at,
      last_sync: acc.last_sync || acc.created_at,
      status: acc.access_token ? 'active' : 'disconnected'
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ accounts: [] });
  }
}
