import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { sendDraftReadyNotification } from '@/lib/onesignal';

export const dynamic = 'force-dynamic';

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
        type: 'info',
        channel: 'gmail',
        title: 'Gmail Triage Completed',
        message: `Processed ${result.processed || 0} emails. Created ${result.draftsCreated || 0} drafts.`,
        priority: 'normal',
        read: false,
      });

      if (result.draftsCreated > 0) {
        try {
          await sendDraftReadyNotification({ count: result.draftsCreated });
        } catch (pushErr) {
          console.warn('Push notification failed (non-critical):', pushErr);
        }
      }
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
