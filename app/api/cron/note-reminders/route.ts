import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { sendNotification } from '@/lib/onesignal';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: recentNotes } = await supabaseServer
      .from('clinical_notes')
      .select('patient_name, appointment_date')
      .gte('appointment_date', yesterdayStr)
      .lte('appointment_date', today.toISOString().split('T')[0]);

    const notedPatients = new Set(
      (recentNotes || []).map(n => `${n.patient_name}|${n.appointment_date}`)
    );

    let calendarEvents: any[] = [];
    try {
      const { data: settings } = await supabaseServer
        .from('app_settings')
        .select('value')
        .eq('key', 'calendar_urls')
        .single();

      if (settings?.value) {
        const urls: string[] = Array.isArray(settings.value)
          ? settings.value
          : JSON.parse(settings.value);

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
              const text = await res.text();
              const events = parseBasicICS(text, yesterdayStr, today.toISOString().split('T')[0]);
              calendarEvents.push(...events);
            }
          } catch (e) {
            console.error('Failed to fetch calendar for reminders:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error loading calendar settings:', e);
    }

    let tasksCreated = 0;
    for (const event of calendarEvents) {
      const key = `${event.summary}|${event.date}`;
      if (!notedPatients.has(key)) {
        const { data: existing } = await supabaseServer
          .from('tasks')
          .select('id')
          .eq('title', `Write note: ${event.summary}`)
          .gte('created_at', yesterdayStr)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabaseServer.from('tasks').insert({
            title: `Write note: ${event.summary}`,
            description: `Session on ${event.date} at ${event.time} - clinical note has not been created yet.`,
            status: 'pending',
            priority: 'high',
            due_date: new Date(event.date + 'T23:59:59Z').toISOString(),
            tags: ['clinical-note', 'reminder'],
          });
          tasksCreated++;
        }
      }
    }

    if (tasksCreated > 0) {
      await supabaseServer.from('notifications').insert({
        type: 'system',
        title: 'Session Notes Needed',
        message: `${tasksCreated} session(s) from yesterday/today still need clinical notes.`,
        priority: tasksCreated >= 3 ? 'high' : 'normal',
        read: false,
      });

      try {
        await sendNotification({
          title: 'Session Notes Needed',
          message: `${tasksCreated} session(s) from yesterday/today still need clinical notes.`,
          url: '/noteai',
          priority: tasksCreated >= 3 ? 'high' : 'normal',
        });
      } catch (pushErr) {
        console.warn('Push notification failed (non-critical):', pushErr);
      }
    }

    return NextResponse.json({
      ok: true,
      calendarEvents: calendarEvents.length,
      notesFound: recentNotes?.length || 0,
      tasksCreated,
    });
  } catch (error: any) {
    console.error('Note reminders cron error:', error);
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  }
}

function parseBasicICS(text: string, startDate: string, endDate: string): any[] {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const lines = unfolded.split('\n');
  const events: any[] = [];
  let inEvent = false;
  let cur: any = {};

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; cur = {}; continue; }
    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (cur.date && cur.date >= startDate && cur.date <= endDate) {
        events.push(cur);
      }
      cur = {};
      continue;
    }
    if (!inEvent) continue;
    const [left, ...rest] = line.split(':');
    if (!left || rest.length === 0) continue;
    const value = rest.join(':');
    const key = left.split(';')[0].toUpperCase();
    if (key === 'SUMMARY') cur.summary = value.replace(/\\n/g, ' ').replace(/\\,/g, ',');
    if (key === 'DTSTART') {
      const v = value.trim();
      if (v.length >= 8) {
        cur.date = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
        if (v.length >= 15) {
          const h = parseInt(v.slice(9, 11));
          const m = v.slice(11, 13);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          cur.time = `${h12}:${m} ${ampm}`;
        } else {
          cur.time = 'All day';
        }
      }
    }
  }

  return events;
}
