import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const pinCookie = request.cookies.get('pin_authenticated');
    if (!pinCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the first row
    const { data, error } = await supabaseServer
      .from('notification_preferences')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      // If no row exists, return defaults
      return NextResponse.json({
        ok: true,
        settings: {
          emailNotifications: false,
          pushNotifications: true,
          smsNotifications: false,
          urgentAlerts: true,
          dailySummary: true,
          weeklyDigest: false,
          newMessageSound: true
        }
      });
    }

    const channels = data.channels || {};

    const settings = {
      emailNotifications: data.enable_email,
      pushNotifications: data.enable_push,
      smsNotifications: channels.sms || false,
      urgentAlerts: channels.urgent_alerts !== undefined ? channels.urgent_alerts : true,
      dailySummary: channels.daily_summary || false,
      weeklyDigest: channels.weekly_digest || false,
      newMessageSound: channels.sound !== undefined ? channels.sound : true,
    };

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error('Notification settings fetch error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pinCookie = request.cookies.get('pin_authenticated');
    if (!pinCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get existing ID
    const { data: existing } = await supabaseServer
      .from('notification_preferences')
      .select('id, channels')
      .limit(1)
      .single();

    const channels = (existing?.channels as any) || {};

    // Update channels JSON
    channels.sms = body.smsNotifications;
    channels.daily_summary = body.dailySummary;
    channels.weekly_digest = body.weeklyDigest;
    channels.sound = body.newMessageSound;
    channels.urgent_alerts = body.urgentAlerts;

    const updates = {
      enable_email: body.emailNotifications,
      enable_push: body.pushNotifications,
      channels: channels
    };

    let error;
    if (existing) {
       const res = await supabaseServer
        .from('notification_preferences')
        .update(updates)
        .eq('id', existing.id);
       error = res.error;
    } else {
       // Insert new
       const res = await supabaseServer
        .from('notification_preferences')
        .insert(updates);
       error = res.error;
    }

    if (error) {
      console.error('Error saving notification settings:', error);
      return NextResponse.json({ ok: false, error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notification settings save error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
