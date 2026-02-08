import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'calendar_urls')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const urls = data?.value ? (Array.isArray(data.value) ? data.value : JSON.parse(data.value)) : [];
    return NextResponse.json({ ok: true, urls });
  } catch (error: any) {
    console.error('Error fetching calendar URLs:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!Array.isArray(urls)) {
      return NextResponse.json({ ok: false, error: 'urls must be an array' }, { status: 400 });
    }

    const validUrls = urls.filter((u: string) => typeof u === 'string' && u.trim().length > 0);

    const { error } = await supabaseServer
      .from('app_settings')
      .upsert({
        key: 'calendar_urls',
        value: validUrls,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ ok: true, urls: validUrls });
  } catch (error: any) {
    console.error('Error saving calendar URLs:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
