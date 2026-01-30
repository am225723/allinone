/**
 * API Route: Notifications
 * @vercel Edge Runtime enabled
 */

import { NextResponse } from 'next/server';
import {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationCount,
} from '@/lib/notifications';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (type === 'unread') {
      const notifications = await getUnreadNotifications();
      return NextResponse.json({ ok: true, notifications });
    }

    if (type === 'count') {
      const count = await getNotificationCount();
      return NextResponse.json({ ok: true, count });
    }

    const notifications = await getNotifications(limit, offset);
    return NextResponse.json({ ok: true, notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, notificationId } = await request.json();

    if (action === 'mark-read') {
      const success = await markAsRead(notificationId);
      return NextResponse.json({ ok: success });
    }

    if (action === 'mark-all-read') {
      const success = await markAllAsRead();
      return NextResponse.json({ ok: success });
    }

    if (action === 'delete') {
      const success = await deleteNotification(notificationId);
      return NextResponse.json({ ok: success });
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error handling notification action:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Action failed' },
      { status: 500 }
    );
  }
}