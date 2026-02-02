import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const pinCookie = request.cookies.get('pin_authenticated');
    
    if (!pinCookie?.value) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Get user info based on session
    // For now, check if there's an admin user
    const { data: adminUser, error } = await supabaseServer
      .from('comm_users')
      .select('role')
      .eq('is_active', true)
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (error || !adminUser) {
      return NextResponse.json({ ok: true, role: 'user' });
    }

    // If authenticated and admin exists, assume admin role
    // In a real app, you'd track which user is logged in
    return NextResponse.json({ ok: true, role: 'admin' });
  } catch (error) {
    console.error('Error checking role:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
