import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

type CalendarEntry = {
  url: string;
  name: string;
  color: string;
  enabled: boolean;
};

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function normalizeCalendars(raw: any): CalendarEntry[] {
  if (!raw) return [];

  const arr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);

  return arr.map((item: any, idx: number) => {
    if (typeof item === 'string') {
      return {
        url: item.trim(),
        name: `Calendar ${idx + 1}`,
        color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        enabled: true,
      };
    }
    return {
      url: (item.url || '').trim(),
      name: item.name || `Calendar ${idx + 1}`,
      color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      enabled: item.enabled !== false,
    };
  }).filter((c: CalendarEntry) => c.url.length > 0);
}

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

    const calendars = normalizeCalendars(data?.value);
    const urls = calendars.map(c => c.url);

    return NextResponse.json({ ok: true, urls, calendars });
  } catch (error: any) {
    console.error('Error fetching calendar URLs:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.calendars && Array.isArray(body.calendars)) {
      const calendars: CalendarEntry[] = body.calendars
        .filter((c: any) => c.url && typeof c.url === 'string' && c.url.trim().length > 0)
        .map((c: any, idx: number) => ({
          url: c.url.trim(),
          name: c.name || `Calendar ${idx + 1}`,
          color: c.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          enabled: c.enabled !== false,
        }));

      const { error } = await supabaseServer
        .from('app_settings')
        .upsert({
          key: 'calendar_urls',
          value: calendars,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;

      return NextResponse.json({ ok: true, calendars, urls: calendars.map(c => c.url) });
    }

    if (body.urls && Array.isArray(body.urls)) {
      const calendars = normalizeCalendars(body.urls);

      const { error } = await supabaseServer
        .from('app_settings')
        .upsert({
          key: 'calendar_urls',
          value: calendars,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;

      return NextResponse.json({ ok: true, calendars, urls: calendars.map(c => c.url) });
    }

    return NextResponse.json({ ok: false, error: 'Provide calendars or urls array' }, { status: 400 });
  } catch (error: any) {
    console.error('Error saving calendar URLs:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
