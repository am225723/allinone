import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 6) {
      return NextResponse.json({ ok: false, error: 'Invalid PIN format' }, { status: 400 });
    }

    // Get stored PIN from database
    const { data, error } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'app_pin')
      .single();

    if (error) {
      console.error('Error fetching PIN:', error);
      // For development/fallback, accept default PIN
      if (pin === '123456') {
        const response = NextResponse.json({ ok: true });
        response.cookies.set('pin_authenticated', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        });
        return response;
      }
      return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
    }

    const storedPin = data?.value;

    if (pin !== storedPin) {
      return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
    }

    // Set authentication cookie
    const response = NextResponse.json({ ok: true });
    response.cookies.set('pin_authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('PIN auth error:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Logout - clear the cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('pin_authenticated');
  return response;
}
