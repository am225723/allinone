/**
 * Cron Job: Daily Summary Email
 * Runs daily at 8 AM UTC via Vercel Cron
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    const [summariesResult, draftsResult, emailsResult] = await Promise.all([
      supabaseServer
        .from('summaries')
        .select('id, needs_response')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      supabaseServer
        .from('draft_replies')
        .select('id, status')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      supabaseServer
        .from('email_logs')
        .select('id, needs_response, draft_created')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
    ]);

    const stats = {
      totalConversations: summariesResult.data?.length || 0,
      needsResponse: summariesResult.data?.filter(s => s.needs_response).length || 0,
      draftsCreated: draftsResult.data?.length || 0,
      draftsSent: draftsResult.data?.filter(d => d.status === 'sent').length || 0,
      draftsApproved: draftsResult.data?.filter(d => d.status === 'approved').length || 0,
      emailsProcessed: emailsResult.data?.length || 0,
      emailDraftsCreated: emailsResult.data?.filter(e => e.draft_created).length || 0,
    };

    await supabaseServer.from('daily_summaries').insert({
      date: yesterday.toISOString().split('T')[0],
      stats,
      created_at: new Date().toISOString(),
    });

    await supabaseServer.from('notifications').insert({
      type: 'summary',
      title: 'Daily Summary Available',
      message: `Yesterday: ${stats.totalConversations} conversations, ${stats.emailsProcessed} emails processed. ${stats.draftsCreated + stats.emailDraftsCreated} drafts created.`,
      priority: 'normal',
      read: false,
      metadata: { stats, date: yesterday.toISOString().split('T')[0] },
    });

    return NextResponse.json({ 
      ok: true, 
      message: 'Daily summary generated',
      stats 
    });
  } catch (error: any) {
    console.error('Cron daily summary error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Cron job failed' 
    }, { status: 500 });
  }
}
