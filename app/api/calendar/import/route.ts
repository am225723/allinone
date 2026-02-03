import { NextRequest, NextResponse } from 'next/server';

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

function parseICS(icsText: string, timezoneOffsetMinutes = 0): CalendarEvent[] {
  const unfolded = icsText
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '');

  const lines = unfolded.split('\n');
  const events: CalendarEvent[] = [];
  let inEvent = false;
  let cur: any = {};

  function parseICalDate(raw: string): Date | null {
    const v = raw.trim();
    if (!v) return null;
    if (/^\d{8}$/.test(v)) {
      const y = Number(v.slice(0, 4));
      const m = Number(v.slice(4, 6)) - 1;
      const d = Number(v.slice(6, 8));
      const dt = new Date(y, m, d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    }
    const match = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
    if (!match) return null;
    const y = Number(match[1]);
    const mo = Number(match[2]) - 1;
    const da = Number(match[3]);
    const hh = Number(match[4]);
    const mm = Number(match[5]);
    const ss = Number(match[6]);
    const isUTC = !!match[7];
    const dt = isUTC ? new Date(Date.UTC(y, mo, da, hh, mm, ss)) : new Date(y, mo, da, hh, mm, ss);

    if (timezoneOffsetMinutes) {
      dt.setMinutes(dt.getMinutes() + timezoneOffsetMinutes);
    }
    return dt;
  }

  function unescapeText(t: string) {
    return t
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  function getColorFromEvent(summary: string, location: string): string {
    const summaryLower = summary.toLowerCase();
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('tele') || summaryLower.includes('telehealth') || summaryLower.includes('video')) {
      return '#3b82f6';
    }
    if (summaryLower.includes('intake') || summaryLower.includes('evaluation') || summaryLower.includes('assessment')) {
      return '#ef4444';
    }
    if (summaryLower.includes('follow') || summaryLower.includes('check')) {
      return '#3b82f6';
    }
    return '#8b5cf6';
  }

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      cur = {};
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (cur.dtstart && cur.dtend) {
        const summary = cur.summary || 'Appointment';
        const location = cur.location || '';
        const ev: CalendarEvent = {
          id: cur.uid || `${cur.dtstart.toISOString()}-${Math.random().toString(16).slice(2)}`,
          start: cur.dtstart.toISOString(),
          end: cur.dtend.toISOString(),
          summary,
          description: cur.description,
          location,
          color: getColorFromEvent(summary, location),
        };
        events.push(ev);
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
    if (key === 'SUMMARY') cur.summary = unescapeText(value);
    if (key === 'DESCRIPTION') cur.description = unescapeText(value);
    if (key === 'LOCATION') cur.location = unescapeText(value);
    if (key === 'DTSTART') cur.dtstart = parseICalDate(value);
    if (key === 'DTEND') cur.dtend = parseICalDate(value);
  }

  return events
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (!url) {
    return NextResponse.json({ ok: false, error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CalendarImport/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }

    const icsText = await response.text();
    const events = parseICS(icsText, offset);

    return NextResponse.json({ ok: true, events });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Import failed' }, { status: 500 });
  }
}
