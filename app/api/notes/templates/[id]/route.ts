import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: template, error } = await supabaseServer
      .from('note_templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    if (!template) {
      return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, template });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, category, sections, is_active } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (sections !== undefined) updates.sections = sections;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: template, error } = await supabaseServer
      .from('note_templates')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, template });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseServer
      .from('note_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
