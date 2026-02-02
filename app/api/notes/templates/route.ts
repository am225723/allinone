import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'edge';

export async function GET() {
  try {
    const { data: templates, error } = await supabase
      .from('note_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ ok: true, templates: templates || [] });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, category, sections } = body;

    if (!name || !sections) {
      return NextResponse.json({ ok: false, error: 'Name and sections are required' }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from('note_templates')
      .insert([{ name, description, category, sections }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, template });
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
