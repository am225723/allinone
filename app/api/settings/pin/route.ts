import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

// Check if user is admin authenticated
function isAdminAuthenticated(request: NextRequest): boolean {
  const adminCookie = request.cookies.get('admin_authenticated');
  return adminCookie?.value === 'true';
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('comm_users')
      .select('pin')
      .eq('role', 'admin')
      .eq('is_active', true)
      .single();

    if (error) {
      // Return default if not found
      return NextResponse.json({ ok: true, pin: '1234' });
    }

    return NextResponse.json({ ok: true, pin: data.pin });
  } catch (error) {
    console.error('Error fetching PIN:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('comm_users')
      .update({ pin })
      .eq('role', 'admin')
      .eq('is_active', true);

    if (error) {
      console.error('Error updating PIN:', error);
      return NextResponse.json({ ok: false, error: 'Failed to update PIN' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'PIN updated successfully' });
  } catch (error) {
    console.error('Error updating PIN:', error);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
