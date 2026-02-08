import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    // Get user with matching PIN from comm_users table
    const { data, error } = await supabaseServer
      .from('comm_users')
      .select('id, pin, name, role')
      .eq('pin', pin)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Error fetching user:', error);
      // For development/fallback, accept default PIN
      if (pin === '1234') {
        const response = NextResponse.json({ ok: true, role: 'user' });
        response.cookies.set('pin_authenticated', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 30, // 30 minutes
          path: '/',
        });
        response.cookies.set('user_id', 'default', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 30, // 30 minutes
          path: '/',
        });
        response.cookies.set('user_role', 'user', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 30, // 30 minutes
          path: '/',
        });
        return response;
      }
      return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
    }

    // Update last_login timestamp
    await supabaseServer
      .from('comm_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id);

    // Set authentication cookies (all httpOnly for security)
    const response = NextResponse.json({ ok: true, role: data.role || 'user' });
    response.cookies.set('pin_authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30, // 30 minutes
      path: '/',
    });
    if (data.role === 'admin') {
      response.cookies.set('admin_authenticated', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 30, // 30 minutes
        path: '/',
      });
    }
    response.cookies.set('user_id', data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30, // 30 minutes
      path: '/',
    });
    response.cookies.set('user_role', data.role || 'user', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30, // 30 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('PIN auth error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Logout - clear all auth cookies
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('pin_authenticated');
  response.cookies.delete('admin_authenticated');
  response.cookies.delete('user_id');
  response.cookies.delete('user_role');
  return response;
}
