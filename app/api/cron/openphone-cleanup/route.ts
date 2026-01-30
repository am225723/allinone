/**
 * Cron Job: OpenPhone Daily Cleanup
 * Runs daily at 6 AM UTC via Vercel Cron
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

function getDateRange() {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { startDate, endDate };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate } = getDateRange();

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/openphone/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate }),
    });

    const result = await response.json();

    await supabaseServer.from('notifications').insert({
      type: 'system',
      title: 'OpenPhone Cleanup Completed',
      message: `Processed ${result.processed || 0} conversations. ${result.errorsCount || 0} errors.`,
      priority: result.errorsCount > 0 ? 'high' : 'normal',
      read: false,
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'OpenPhone cleanup completed',
      result 
    });
  } catch (error: any) {
    console.error('Cron OpenPhone cleanup error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Cron job failed' 
    }, { status: 500 });
  }
}
