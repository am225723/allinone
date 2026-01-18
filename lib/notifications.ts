/**
 * Notification System
 * Handle in-app and push notifications
 */

import { supabaseServer as supabase } from './supabase';

export interface Notification {
  id: string;
  type: 'urgent' | 'normal' | 'info';
  channel: 'openphone' | 'gmail' | 'system';
  title: string;
  message: string;
  priority: 'high' | 'normal' | 'low';
  read: boolean;
  created_at: string;
  metadata?: any;
}

export interface NotificationPreferences {
  enablePush: boolean;
  enableEmail: boolean;
  enableInApp: boolean;
  highPriorityOnly: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  channels: {
    openphone: boolean;
    gmail: boolean;
    system: boolean;
  };
}

/**
 * Create a new notification
 */
export async function createNotification(params: {
  type: 'urgent' | 'normal' | 'info';
  channel: 'openphone' | 'gmail' | 'system';
  title: string;
  message: string;
  priority: 'high' | 'normal' | 'low';
  metadata?: any;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: params.type,
        channel: params.channel,
        title: params.title,
        message: params.message,
        priority: params.priority,
        metadata: params.metadata,
        read: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Send push notification if enabled and high priority
    if (params.priority === 'high') {
      await sendPushNotification(params);
    }

    return data.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get all notifications with pagination
 */
export async function getNotifications(
  limit: number = 20,
  offset: number = 0
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return false;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Get notification count
 */
export async function getNotificationCount(): Promise<{ total: number; unread: number }> {
  try {
    const [{ count: total }, { count: unread }] = await Promise.all([
      supabase.from('notifications').select('*', { count: 'exact', head: true }),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('read', false),
    ]);

    return {
      total: total || 0,
      unread: unread || 0,
    };
  } catch (error) {
    console.error('Error getting notification count:', error);
    return { total: 0, unread: 0 };
  }
}

/**
 * Send push notification (browser)
 */
async function sendPushNotification(params: {
  title: string;
  message: string;
  priority: 'high' | 'normal' | 'low';
}) {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return;
  }

  // Check permission
  if (Notification.permission === 'granted') {
    new Notification(params.title, {
      body: params.message,
      icon: '/icon.png',
      badge: '/badge.png',
      tag: 'communication-dashboard',
      requireInteraction: params.priority === 'high',
    });
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(params.title, {
        body: params.message,
        icon: '/icon.png',
      });
    }
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .single();

    if (error) throw error;

    return data || getDefaultPreferences();
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return getDefaultPreferences();
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(preferences);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating preferences:', error);
    return false;
  }
}

/**
 * Get default preferences
 */
function getDefaultPreferences(): NotificationPreferences {
  return {
    enablePush: true,
    enableEmail: false,
    enableInApp: true,
    highPriorityOnly: false,
    channels: {
      openphone: true,
      gmail: true,
      system: true,
    },
  };
}

/**
 * Check if notification should be sent based on preferences
 */
export async function shouldSendNotification(
  channel: 'openphone' | 'gmail' | 'system',
  priority: 'high' | 'normal' | 'low'
): Promise<boolean> {
  const prefs = await getNotificationPreferences();

  // Check if channel is enabled
  if (!prefs.channels[channel]) {
    return false;
  }

  // Check if high priority only
  if (prefs.highPriorityOnly && priority !== 'high') {
    return false;
  }

  // Check quiet hours
  if (prefs.quietHoursStart && prefs.quietHoursEnd) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number);
    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    if (quietStart < quietEnd) {
      if (currentTime >= quietStart && currentTime <= quietEnd) {
        return false;
      }
    } else {
      if (currentTime >= quietStart || currentTime <= quietEnd) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create notification for new high priority email
 */
export async function notifyHighPriorityEmail(emailData: {
  from: string;
  subject: string;
  messageId: string;
}) {
  const shouldSend = await shouldSendNotification('gmail', 'high');
  if (!shouldSend) return;

  await createNotification({
    type: 'urgent',
    channel: 'gmail',
    title: 'High Priority Email',
    message: `From: ${emailData.from}\nSubject: ${emailData.subject}`,
    priority: 'high',
    metadata: { messageId: emailData.messageId },
  });
}

/**
 * Create notification for SMS needing response
 */
export async function notifySMSNeedsResponse(smsData: {
  phoneNumber: string;
  summary: string;
  conversationId: string;
}) {
  const shouldSend = await shouldSendNotification('openphone', 'high');
  if (!shouldSend) return;

  await createNotification({
    type: 'urgent',
    channel: 'openphone',
    title: 'SMS Needs Response',
    message: `From: ${smsData.phoneNumber}\n${smsData.summary}`,
    priority: 'high',
    metadata: { conversationId: smsData.conversationId },
  });
}