import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'edge';

interface CalendarEvent {
  id: string;
  start: string;
  end: string;
  summary: string;
  description?: string;
  location?: string;
  color: string;
}

function parseICS(icsText: string): CalendarEvent[] {
  const unfolded = icsText.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const lines = unfolded.split('\n');
  const events: CalendarEvent[] = [];
  let inEvent = false;
  let cur: any = {};

  function parseICalDate(raw: string): Date | null {
    const v = raw.trim();
    if (!v) return null;
    if (/^\d{8}$/.test(v)) {
      return new Date(Number(v.slice(0,4)), Number(v.slice(4,6))-1, Number(v.slice(6,8)));
    }
    const match = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
    if (!match) return null;
    const isUTC = !!match[7];
    return isUTC
      ? new Date(Date.UTC(+match[1], +match[2]-1, +match[3], +match[4], +match[5], +match[6]))
      : new Date(+match[1], +match[2]-1, +match[3], +match[4], +match[5], +match[6]);
  }

  function getColor(summary: string, location: string): string {
    const s = summary.toLowerCase(), l = location.toLowerCase();
    if (l.includes('tele') || s.includes('telehealth') || s.includes('video')) return '#3b82f6';
    if (s.includes('intake') || s.includes('evaluation')) return '#ef4444';
    return '#8b5cf6';
  }

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; cur = {}; continue; }
    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (cur.dtstart && cur.dtend) {
        events.push({
          id: cur.uid || `${cur.dtstart.toISOString()}-${Math.random().toString(16).slice(2)}`,
          start: cur.dtstart.toISOString(),
          end: cur.dtend.toISOString(),
          summary: cur.summary || 'Appointment',
          description: cur.description,
          location: cur.location || '',
          color: getColor(cur.summary || '', cur.location || ''),
        });
      }
      cur = {};
      continue;
    }
    if (!inEvent) continue;
    const [left, ...rest] = line.split(':');
    if (!left || rest.length === 0) continue;
    const value = rest.join(':');
    const key = left.split(';')[0].toUpperCase();
    if (key === 'UID') cur.uid = value.trim();
    if (key === 'SUMMARY') cur.summary = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
    if (key === 'DESCRIPTION') cur.description = value.replace(/\\n/g, '\n');
    if (key === 'LOCATION') cur.location = value.replace(/\\n/g, '\n');
    if (key === 'DTSTART') cur.dtstart = parseICalDate(value);
    if (key === 'DTEND') cur.dtend = parseICalDate(value);
  }

  return events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const { data } = await supabaseServer
      .from('app_settings')
      .select('value')
      .eq('key', 'calendar_urls')
      .single();

    if (!data?.value) return [];

    const urls: string[] = Array.isArray(data.value) ? data.value : JSON.parse(data.value);
    const allEvents: CalendarEvent[] = [];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'CalendarImport/1.0' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const icsText = await res.text();
          if (icsText.length < 5_000_000) {
            allEvents.push(...parseICS(icsText));
          }
        }
      } catch (e) {
        console.error('Failed to fetch calendar:', url, e);
      }
    }

    const seen = new Set<string>();
    return allEvents
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  } catch (e) {
    console.error('Error fetching calendar settings:', e);
    return [];
  }
}

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const today = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const events = await fetchCalendarEvents();

  const todayEvents = events.filter(e => {
    const start = new Date(e.start);
    return start >= todayStart && start < todayEnd;
  });

  const weekEvents = events.filter(e => {
    const start = new Date(e.start);
    return start >= todayStart && start < weekEnd;
  });

  const upcomingEvents = events.filter(e => new Date(e.start) > now);
  const nextAppointment = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

  let notesPending = 0;
  try {
    const { count } = await supabaseServer
      .from('clinical_notes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'draft');
    notesPending = count || 0;
  } catch (e) {
    // Table may not exist
  }

  const appointmentsList = todayEvents.map(e => {
    const start = new Date(e.start);
    return {
      time: start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      patient: e.summary,
      type: e.location || 'Appointment',
    };
  });

  const payload = {
    notesPending,
    appointmentsThisWeek: weekEvents.length,
    appointmentsToday: todayEvents.length,
    topIcd10: [],
    appointmentsTodayList: {
      dateLabel: today,
      items: appointmentsList,
    },
    nextAppointment: nextAppointment ? {
      time: new Date(nextAppointment.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      summary: nextAppointment.summary,
      start: nextAppointment.start,
    } : null,
  };

  return NextResponse.json({ ok: true, stats: payload });
}
