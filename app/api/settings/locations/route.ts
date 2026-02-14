import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  try {
    const { data } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'locations')
      .order('updated_at', { ascending: false })
      .limit(1);

    let locations: any[] = [];
    if (data?.[0]?.value) {
      try {
        locations = typeof data[0].value === 'string'
          ? JSON.parse(data[0].value)
          : data[0].value;
      } catch { locations = []; }
    }

    if (!Array.isArray(locations)) locations = [];

    return NextResponse.json({ ok: true, locations });
  } catch (error: any) {
    console.error('Error loading locations:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { locations } = await request.json();

    if (!Array.isArray(locations)) {
      return NextResponse.json({ ok: false, error: 'locations must be an array' }, { status: 400 });
    }

    const { data: existing } = await supabaseServer
      .from('app_settings')
      .select('id')
      .eq('key', 'locations')
      .order('updated_at', { ascending: false })
      .limit(1);

    const existingId = existing?.[0]?.id;

    if (existingId) {
      const { error } = await supabaseServer
        .from('app_settings')
        .update({ value: locations })
        .eq('id', existingId);
      if (error) {
        await supabaseServer
          .from('app_settings')
          .update({ value: JSON.stringify(locations) })
          .eq('id', existingId);
      }
    } else {
      const { error } = await supabaseServer
        .from('app_settings')
        .insert({ key: 'locations', value: locations });
      if (error) {
        await supabaseServer
          .from('app_settings')
          .insert({ key: 'locations', value: JSON.stringify(locations) });
      }
    }

    return NextResponse.json({ ok: true, locations });
  } catch (error: any) {
    console.error('Error saving locations:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
