import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

type CalendarEntry = {
  url: string;
  name: string;
  color: string;
  enabled: boolean;
};

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function normalizeCalendars(raw: any): CalendarEntry[] {
  if (!raw) return [];

  let arr: any[];
  try {
    arr = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
  } catch {
    return [];
  }

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

async function loadExisting(): Promise<{ id: string | null; calendars: CalendarEntry[] }> {
  const { data, error } = await supabaseServer
    .from('app_settings')
    .select('id, value')
    .eq('key', 'calendar_urls')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error loading calendar settings:', error);
    return { id: null, calendars: [] };
  }

  const row = data?.[0];
  return {
    id: row?.id || null,
    calendars: normalizeCalendars(row?.value),
  };
}

async function saveCalendars(calendars: CalendarEntry[], existingId: string | null): Promise<void> {
  const valuePayload = calendars as any;
  if (existingId) {
    const { error } = await supabaseServer
      .from('app_settings')
      .update({ value: valuePayload })
      .eq('id', existingId);
    if (error) {
      const { error: error2 } = await supabaseServer
        .from('app_settings')
        .update({ value: JSON.stringify(calendars) })
        .eq('id', existingId);
      if (error2) throw error2;
    }
  } else {
    const { error } = await supabaseServer
      .from('app_settings')
      .insert({ key: 'calendar_urls', value: valuePayload });
    if (error) {
      const { error: error2 } = await supabaseServer
        .from('app_settings')
        .insert({ key: 'calendar_urls', value: JSON.stringify(calendars) });
      if (error2) throw error2;
    }
  }
}

export async function GET() {
  try {
    const { calendars } = await loadExisting();
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
    const { id: existingId } = await loadExisting();

    let calendars: CalendarEntry[];

    if (body.calendars && Array.isArray(body.calendars)) {
      calendars = body.calendars
        .filter((c: any) => c.url && typeof c.url === 'string' && c.url.trim().length > 0)
        .map((c: any, idx: number) => ({
          url: c.url.trim(),
          name: c.name || `Calendar ${idx + 1}`,
          color: c.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          enabled: c.enabled !== false,
        }));
    } else if (body.urls && Array.isArray(body.urls)) {
      calendars = normalizeCalendars(body.urls);
    } else {
      return NextResponse.json({ ok: false, error: 'Provide calendars or urls array' }, { status: 400 });
    }

    await saveCalendars(calendars, existingId);

    return NextResponse.json({ ok: true, calendars, urls: calendars.map(c => c.url) });
  } catch (error: any) {
    console.error('Error saving calendar URLs:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
