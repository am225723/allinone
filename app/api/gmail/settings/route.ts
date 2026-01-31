import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data } = await supabaseServer
      .from('app_settings')
      .select('*')
      .eq('category', 'gmail')
      .single();

    return NextResponse.json({
      lookbackDays: data?.lookback_days || 14,
      autoTriage: data?.auto_triage || false,
      skipSenders: data?.skip_senders || '',
      skipSubjects: data?.skip_subjects || '',
      triageInterval: data?.triage_interval || 4
    });
  } catch (error) {
    return NextResponse.json({
      lookbackDays: 14,
      autoTriage: false,
      skipSenders: '',
      skipSubjects: '',
      triageInterval: 4
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { error } = await supabaseServer
      .from('app_settings')
      .upsert({
        category: 'gmail',
        lookback_days: body.lookbackDays,
        auto_triage: body.autoTriage,
        skip_senders: body.skipSenders,
        skip_subjects: body.skipSubjects,
        triage_interval: body.triageInterval,
        updated_at: new Date().toISOString()
      }, { onConflict: 'category' });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
