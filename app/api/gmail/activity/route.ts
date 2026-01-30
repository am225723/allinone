/**
 * @vercel Edge Runtime enabled
 */
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('email_logs')
      .select(`
        id,
        gmail_account_id,
        gmail_message_id,
        subject,
        from_address,
        summary,
        needs_response,
        priority,
        draft_created,
        created_at,
        gmail_accounts(email)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to include inbox_email
    const transformed = (data || []).map((row: any) => ({
      ...row,
      inbox_email: row.gmail_accounts?.email || null,
      gmail_accounts: undefined,
    }));

    return NextResponse.json({ data: transformed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}