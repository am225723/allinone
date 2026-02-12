import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('comm_users')
      .select('id, name, email, role, is_active, created_at, last_login')
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

async function checkDuplicatePin(pin: string, excludeId?: string) {
  const query = supabaseServer
    .from('comm_users')
    .select('id, name')
    .eq('pin', pin)
    .eq('is_active', true);

  if (excludeId) {
    query.neq('id', excludeId);
  }

  const { data } = await query.maybeSingle();
  return data;
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

    const existing = await checkDuplicatePin(pin);
    if (existing) {
      return NextResponse.json({ ok: false, error: `PIN already in use by ${existing.name}` }, { status: 409 });
    }

    const { data, error } = await supabaseServer
      .from('comm_users')
      .insert({
        name,
        email: email || null,
        pin,
        role: role || 'user',
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      if (error.message?.includes('idx_comm_users_pin_unique')) {
        return NextResponse.json({ ok: false, error: 'This PIN is already in use by another user' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, pin, role, is_active } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'User ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};

    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email || null;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    if (pin !== undefined) {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ ok: false, error: 'PIN must be exactly 4 digits' }, { status: 400 });
      }
      const existing = await checkDuplicatePin(pin, id);
      if (existing) {
        return NextResponse.json({ ok: false, error: `PIN already in use by ${existing.name}` }, { status: 409 });
      }
      updates.pin = pin;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('comm_users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, is_active, created_at, last_login')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      if (error.message?.includes('idx_comm_users_pin_unique')) {
        return NextResponse.json({ ok: false, error: 'This PIN is already in use by another user' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update user' }, { status: 500 });
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
