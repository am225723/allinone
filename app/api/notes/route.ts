import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('clinical_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: notes, error } = await query;

    if (error) throw error;

    return NextResponse.json({ ok: true, notes: notes || [] });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patient_name, patient_id, appointment_date, template_id, template_name, content } = body;

    if (!patient_name || !appointment_date) {
      return NextResponse.json({ ok: false, error: 'Patient name and appointment date are required' }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('clinical_notes')
      .insert([{
        patient_name,
        patient_id,
        appointment_date,
        template_id,
        template_name,
        content,
        status: 'draft'
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, note });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, content, generated_content, status, pdf_url } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Note ID is required' }, { status: 400 });
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (content !== undefined) updates.content = content;
    if (generated_content !== undefined) updates.generated_content = generated_content;
    if (status !== undefined) updates.status = status;
    if (pdf_url !== undefined) updates.pdf_url = pdf_url;

    const { data: note, error } = await supabase
      .from('clinical_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, note });
  } catch (error: any) {
    console.error('Error updating note:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
