import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const pinCookie = request.cookies.get('pin_authenticated');
    const userIdCookie = request.cookies.get('user_id');

    if (!pinCookie?.value || !userIdCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userIdCookie.value;

    let profile: any = {
      name: 'Default User',
      email: 'user@example.com',
      phone: '',
      timezone: 'America/New_York',
      sentimentReport: '',
    };

    if (userId !== 'default') {
      const { data } = await supabaseServer
        .from('comm_users')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (data) {
        profile.name = data.name || profile.name;
        profile.email = data.email || profile.email;
      }
    }

    const { data: settingsData } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'user_profile_extra')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (settingsData?.[0]?.value) {
      let extra: any;
      try {
        extra = typeof settingsData[0].value === 'string'
          ? JSON.parse(settingsData[0].value)
          : settingsData[0].value;
      } catch { extra = {}; }
      profile.phone = extra.phone || '';
      profile.timezone = extra.timezone || 'America/New_York';
      profile.sentimentReport = extra.sentimentReport || '';
    }

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const pinCookie = request.cookies.get('pin_authenticated');
    const userIdCookie = request.cookies.get('user_id');

    if (!pinCookie?.value || !userIdCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userIdCookie.value;
    const body = await request.json();

    if (userId !== 'default') {
      const updates: any = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.email !== undefined) updates.email = body.email;

      if (Object.keys(updates).length > 0) {
        await supabaseServer
          .from('comm_users')
          .update(updates)
          .eq('id', userId);
      }
    }

    const extraFields = {
      phone: body.phone || '',
      timezone: body.timezone || 'America/New_York',
      sentimentReport: body.sentimentReport || '',
    };

    const { data: existing } = await supabaseServer
      .from('app_settings')
      .select('id')
      .eq('key', 'user_profile_extra')
      .order('updated_at', { ascending: false })
      .limit(1);

    const existingId = existing?.[0]?.id;

    if (existingId) {
      const { error } = await supabaseServer
        .from('app_settings')
        .update({ value: extraFields })
        .eq('id', existingId);
      if (error) {
        await supabaseServer
          .from('app_settings')
          .update({ value: JSON.stringify(extraFields) })
          .eq('id', existingId);
      }
    } else {
      const { error } = await supabaseServer
        .from('app_settings')
        .insert({ key: 'user_profile_extra', value: extraFields });
      if (error) {
        await supabaseServer
          .from('app_settings')
          .insert({ key: 'user_profile_extra', value: JSON.stringify(extraFields) });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
