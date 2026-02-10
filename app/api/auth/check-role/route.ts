import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

const SESSION_MAX_AGE = 60 * 30;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

function clearAllCookies(response: NextResponse) {
  response.cookies.delete('pin_authenticated');
  response.cookies.delete('admin_authenticated');
  response.cookies.delete('user_id');
  response.cookies.delete('user_role');
  response.cookies.delete('last_active');
}

function setSessionCookies(response: NextResponse, userId: string, role: string) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE,
    path: '/',
  };
  response.cookies.set('pin_authenticated', 'true', cookieOptions);
  response.cookies.set('user_id', userId, cookieOptions);
  response.cookies.set('user_role', role, cookieOptions);
  if (role === 'admin') {
    response.cookies.set('admin_authenticated', 'true', cookieOptions);
  }
}

export async function GET(request: NextRequest) {
  try {
    const pinCookie = request.cookies.get('pin_authenticated');
    const userIdCookie = request.cookies.get('user_id');
    const userRoleCookie = request.cookies.get('user_role');
    const lastActiveCookie = request.cookies.get('last_active');
    
    if (!pinCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    if (lastActiveCookie?.value) {
      const lastActive = parseInt(lastActiveCookie.value, 10);
      const inactiveDuration = Date.now() - lastActive;
      if (inactiveDuration >= INACTIVITY_TIMEOUT) {
        const response = NextResponse.json({ ok: false, error: 'Session expired due to inactivity' }, { status: 401 });
        clearAllCookies(response);
        return response;
      }
    }

    const userId = userIdCookie?.value || 'default';
    const userRole = userRoleCookie?.value || 'user';
    
    if (!userId || userId === 'default') {
      const response = NextResponse.json({ ok: true, role: 'user' });
      setSessionCookies(response, 'default', 'user');
      return response;
    }

    const { data: user, error } = await supabaseServer
      .from('comm_users')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (error || !user) {
      const response = NextResponse.json({ ok: true, role: userRole });
      setSessionCookies(response, userId, userRole);
      return response;
    }

    if (!user.is_active) {
      return NextResponse.json({ ok: false, error: 'User is inactive' }, { status: 403 });
    }

    const verifiedRole = user.role || 'user';
    const response = NextResponse.json({ ok: true, role: verifiedRole });
    setSessionCookies(response, userId, verifiedRole);
    return response;
  } catch (error) {
    console.error('Error checking role:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
