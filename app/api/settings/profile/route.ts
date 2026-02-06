import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const pinCookie = request.cookies.get('pin_authenticated');
    const userIdCookie = request.cookies.get('user_id');

    if (!pinCookie?.value || !userIdCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userIdCookie.value;

    if (userId === 'default') {
      return NextResponse.json({
        ok: true,
        profile: {
          name: 'Default User',
          email: 'user@example.com',
          phone: '',
          timezone: 'UTC'
        }
      });
    }

    // Fetch basic profile info
    const { data, error } = await supabaseServer
      .from('comm_users')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ ok: false, error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      profile: {
        name: data.name,
        email: data.email,
        // Default values for fields that might not be in the table yet
        phone: '',
        timezone: 'America/New_York'
      }
    });
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
    const { name, email } = await request.json();

    if (userId === 'default') {
      // Cannot update default user profile in DB
      return NextResponse.json({ ok: true, message: 'Profile updated (mock)' });
    }

    // Only update name and email for now as we are sure those columns exist
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;

    const { error } = await supabaseServer
      .from('comm_users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ ok: false, error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
