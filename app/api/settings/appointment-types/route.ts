import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  try {
    const { data } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'appointment_types')
      .order('updated_at', { ascending: false })
      .limit(1);

    let types: any[] = [];
    if (data?.[0]?.value) {
      try {
        types = typeof data[0].value === 'string'
          ? JSON.parse(data[0].value)
          : data[0].value;
      } catch { types = []; }
    }

    if (!Array.isArray(types)) types = [];

    return NextResponse.json({ ok: true, types });
  } catch (error: any) {
    console.error('Error loading appointment types:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { types } = await request.json();

    if (!Array.isArray(types)) {
      return NextResponse.json({ ok: false, error: 'types must be an array' }, { status: 400 });
    }

    const { data: existing } = await supabaseServer
      .from('app_settings')
      .select('id')
      .eq('key', 'appointment_types')
      .order('updated_at', { ascending: false })
      .limit(1);

    const existingId = existing?.[0]?.id;

    if (existingId) {
      const { error } = await supabaseServer
        .from('app_settings')
        .update({ value: types })
        .eq('id', existingId);
      if (error) {
        await supabaseServer
          .from('app_settings')
          .update({ value: JSON.stringify(types) })
          .eq('id', existingId);
      }
    } else {
      const { error } = await supabaseServer
        .from('app_settings')
        .insert({ key: 'appointment_types', value: types });
      if (error) {
        await supabaseServer
          .from('app_settings')
          .insert({ key: 'appointment_types', value: JSON.stringify(types) });
      }
    }

    return NextResponse.json({ ok: true, types });
  } catch (error: any) {
    console.error('Error saving appointment types:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
