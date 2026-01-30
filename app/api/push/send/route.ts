/**
 * API Route: Send Push Notification
 * Requires valid API key or cron secret for authentication
 * @vercel Edge Runtime enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, sendUrgentMessageNotification, sendDraftReadyNotification } from '@/lib/onesignal';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    
    const cronSecret = process.env.CRON_SECRET;
    const pushApiSecret = process.env.PUSH_API_SECRET;
    
    const isAuthorized = 
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (pushApiSecret && apiKeyHeader === pushApiSecret);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, ...params } = await request.json();

    let result;

    switch (type) {
      case 'urgent_message':
        result = await sendUrgentMessageNotification(params);
        break;

      case 'drafts_ready':
        result = await sendDraftReadyNotification(params);
        break;

      case 'custom':
        result = await sendNotification({
          title: params.title,
          message: params.message,
          url: params.url,
          data: params.data,
          segments: params.segments,
          playerIds: params.playerIds,
          priority: params.priority,
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: error?.message || 'Send failed' }, { status: 500 });
  }
}
