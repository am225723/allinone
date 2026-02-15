import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function DELETE() {
  try {
    // Delete all email_logs
    const { error: emailLogsError } = await supabaseServer
      .from('email_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Use neq to delete all

    if (emailLogsError) {
      console.error('Error deleting email_logs:', emailLogsError);
      return NextResponse.json({ ok: false, error: 'Failed to clear email logs' }, { status: 500 });
    }

    // You can add more tables to clear here if needed

    return NextResponse.json({ ok: true, message: 'Statistics cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing statistics:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Internal server error' }, { status: 500 });
  }
}