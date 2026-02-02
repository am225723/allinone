import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'edge';

export async function GET() {
  try {
    const { data: prompts, error } = await supabase
      .from('note_prompts')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ ok: true, prompts: prompts || [] });
  } catch (error: any) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, content, category } = body;

    if (!name || !content) {
      return NextResponse.json({ ok: false, error: 'Name and content are required' }, { status: 400 });
    }

    const { data: prompt, error } = await supabase
      .from('note_prompts')
      .insert([{ name, description, content, category }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, prompt });
  } catch (error: any) {
    console.error('Error creating prompt:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Prompt ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('note_prompts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
