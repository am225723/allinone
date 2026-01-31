import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('comm_users')
      .select('id, name, email, role, created_at, last_login')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ ok: true, users: [] });
    }

    return NextResponse.json({ ok: true, users: data || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ok: true, users: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, pin, role } = body;

    if (!name || !pin) {
      return NextResponse.json({ ok: false, error: 'Name and PIN are required' }, { status: 400 });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('comm_users')
      .insert({
        name,
        email: email || null,
        pin_code: pin,
        role: role || 'user',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'User ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('comm_users')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to delete user' }, { status: 500 });
  }
}
