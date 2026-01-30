/**
 * Cron Job: Gmail Auto-Triage
 * Runs every 4 hours via Vercel Cron
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/gmail/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookbackDays: 3 }),
    });

    const result = await response.json();

    if (result.processed > 0 || result.draftsCreated > 0) {
      await supabaseServer.from('notifications').insert({
        type: 'system',
        title: 'Gmail Triage Completed',
        message: `Processed ${result.processed || 0} emails. Created ${result.draftsCreated || 0} drafts.`,
        priority: 'normal',
        read: false,
      });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Gmail triage completed',
      result 
    });
  } catch (error: any) {
    console.error('Cron Gmail triage error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Cron job failed' 
    }, { status: 500 });
  }
}
