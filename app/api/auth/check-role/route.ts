import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Read httpOnly cookies set by server during PIN auth
    const pinCookie = request.cookies.get('pin_authenticated');
    const userIdCookie = request.cookies.get('user_id');
    const userRoleCookie = request.cookies.get('user_role');
    
    if (!pinCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const userId = userIdCookie?.value;
    const userRole = userRoleCookie?.value;
    
    // If no user ID, return basic user role
    if (!userId || userId === 'default') {
      return NextResponse.json({ ok: true, role: 'user' });
    }

    // Validate user still exists and is active, and verify role from database
    const { data: user, error } = await supabaseServer
      .from('comm_users')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (error || !user) {
      // User not found, return user role from cookie as fallback
      return NextResponse.json({ ok: true, role: userRole || 'user' });
    }

    if (!user.is_active) {
      return NextResponse.json({ ok: false, error: 'User is inactive' }, { status: 403 });
    }

    // Return the verified role from database
    return NextResponse.json({ ok: true, role: user.role || 'user' });
  } catch (error) {
    console.error('Error checking role:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
