/**
 * OneSignal Push Notification Service
 * Handles mobile and web push notifications
 */

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

interface PushNotificationPayload {
  title: string;
  message: string;
  url?: string;
  data?: Record<string, any>;
  segments?: string[];
  playerIds?: string[];
  priority?: 'high' | 'normal';
}

interface OneSignalResponse {
  id: string;
  recipients: number;
  errors?: any;
}

async function sendNotification(payload: PushNotificationPayload): Promise<OneSignalResponse> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn('OneSignal not configured - skipping push notification');
    return { id: '', recipients: 0 };
  }

  const body: Record<string, any> = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: payload.title },
    contents: { en: payload.message },
    data: payload.data || {},
  };

  if (payload.url) {
    body.url = payload.url;
  }

  if (payload.playerIds && payload.playerIds.length > 0) {
    body.include_player_ids = payload.playerIds;
  } else if (payload.segments && payload.segments.length > 0) {
    body.included_segments = payload.segments;
  } else {
    body.included_segments = ['All'];
  }

  if (payload.priority === 'high') {
    body.priority = 10;
    body.android_channel_id = 'high_priority';
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OneSignal API error: ${error}`);
  }

  return response.json();
}

export async function sendUrgentMessageNotification(params: {
  contactName: string;
  preview: string;
  conversationId: string;
  playerIds?: string[];
}) {
  return sendNotification({
    title: `Urgent: Message from ${params.contactName}`,
    message: params.preview.substring(0, 100) + (params.preview.length > 100 ? '...' : ''),
    url: `/openphone?conversation=${params.conversationId}`,
    data: {
      type: 'urgent_message',
      conversationId: params.conversationId,
    },
    priority: 'high',
    playerIds: params.playerIds,
  });
}

export async function sendDraftReadyNotification(params: {
  count: number;
  playerIds?: string[];
}) {
  return sendNotification({
    title: 'Drafts Ready for Review',
    message: `${params.count} draft ${params.count === 1 ? 'reply' : 'replies'} waiting for your approval.`,
    url: '/openphone',
    data: {
      type: 'drafts_ready',
      count: params.count,
    },
    playerIds: params.playerIds,
  });
}

export async function sendDailySummaryNotification(params: {
  stats: {
    totalConversations: number;
    needsResponse: number;
    draftsCreated: number;
  };
  playerIds?: string[];
}) {
  return sendNotification({
    title: 'Daily Summary',
    message: `${params.stats.totalConversations} conversations, ${params.stats.needsResponse} need response, ${params.stats.draftsCreated} drafts created.`,
    url: '/',
    data: {
      type: 'daily_summary',
      stats: params.stats,
    },
    playerIds: params.playerIds,
  });
}

export async function sendNewEmailNotification(params: {
  subject: string;
  from: string;
  priority: string;
  playerIds?: string[];
}) {
  return sendNotification({
    title: params.priority === 'high' ? 'Urgent Email' : 'New Email',
    message: `From: ${params.from}\n${params.subject}`,
    url: '/gmail',
    data: {
      type: 'new_email',
      priority: params.priority,
    },
    priority: params.priority === 'high' ? 'high' : 'normal',
    playerIds: params.playerIds,
  });
}

export async function registerDevice(playerId: string, userId?: string): Promise<boolean> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return false;
  }

  const body: Record<string, any> = {
    app_id: ONESIGNAL_APP_ID,
  };

  if (userId) {
    body.external_user_id = userId;
  }

  const response = await fetch(`https://onesignal.com/api/v1/players/${playerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  return response.ok;
}

export { sendNotification };
