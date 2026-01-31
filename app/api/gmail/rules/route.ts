import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('agent_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ rules: [] });
    }

    return NextResponse.json({ rules: data || [] });
  } catch (error) {
    return NextResponse.json({ rules: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, pattern, action } = body;

    if (!pattern) {
      return NextResponse.json({ ok: false, error: 'Pattern is required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('agent_rules')
      .insert({
        type,
        pattern,
        action,
        created_at: new Date().toISOString()
      });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to create rule' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Rule ID required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('agent_rules')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to delete rule' }, { status: 500 });
  }
}
