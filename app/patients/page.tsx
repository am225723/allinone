'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CalendarEvent = {
  id: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  color?: string;
  client?: {
    name?: string;
    dob?: string;
    address?: string;
    gender?: string;
    email?: string;
    phone?: string;
  };
  appointment?: {
    type?: string;
    notes?: string;
  };
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function clamp(min: number, n: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Minimal iCalendar (.ics) parser for VEVENT DTSTART/DTEND/SUMMARY/DESCRIPTION/LOCATION.
// Good enough for a first pass; we can harden it later (RRULE, recurrences, EXDATE, etc.).
function parseICS(icsText: string, timezoneOffsetMinutes = 0): CalendarEvent[] {
  const unfolded = icsText
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, ''); // unfold lines

  const lines = unfolded.split('\n');
  const events: CalendarEvent[] = [];
  let inEvent = false;
  let cur: any = {};

  function parseICalDate(raw: string): Date | null {
    // Examples: 20260131T140000Z, 20260131T140000, 20260131
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
    const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6]);
    const isUTC = !!m[7];
    const dt = isUTC ? new Date(Date.UTC(y, mo, da, hh, mm, ss)) : new Date(y, mo, da, hh, mm, ss);

    // Apply user-selected offset (helps correct timezone issues after import)
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

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      cur = {};
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      if (cur.dtstart && cur.dtend) {
        const ev: CalendarEvent = {
          id: cur.uid || `${cur.dtstart.toISOString()}-${Math.random().toString(16).slice(2)}`,
          start: cur.dtstart,
          end: cur.dtend,
          summary: cur.summary || 'Appointment',
          description: cur.description,
          location: cur.location,
          color: '#3b82f6',
          client: {},
          appointment: {},
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
    .filter(e => e.start && e.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function hoursBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / 3600000;
}

function generateTimeSlots() {
  const slots: { label: string; hour: number }[] = [];
  for (let h = 6; h <= 20; h += 1) {
    const dt = new Date();
    dt.setHours(h, 0, 0, 0);
    slots.push({ label: dt.toLocaleTimeString([], { hour: 'numeric' }), hour: h });
  }
  return slots;
}

export default function PatientsPage() {
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [tzOffsetMins, setTzOffsetMins] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const slots = useMemo(() => generateTimeSlots(), []);

  const eventsForDay = useMemo(() => {
    const day = selectedDay;
    return events
      .filter(e => sameDay(e.start, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, selectedDay]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find(e => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  useEffect(() => {
    // Seed with a couple demo appointments so the UI isn't empty.
    // Once you import an iCal, these are replaced.
    const now = new Date();
    const d = startOfDay(now);
    const demo: CalendarEvent[] = [
      {
        id: 'demo-1',
        start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0),
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 45, 0),
        summary: 'Follow-up: Anxiety',
        description: 'Reason: medication follow-up',
        location: 'Telehealth',
        color: '#3b82f6',
        client: {
          name: 'Jamie Rivera',
          dob: '1993-07-18',
          gender: 'Female',
          email: 'jamie@example.com',
          phone: '(555) 555-0134',
          address: '123 Main St, New York, NY',
        },
        appointment: { type: 'Follow-up', notes: '' },
      },
      {
        id: 'demo-2',
        start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 13, 30, 0),
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 14, 15, 0),
        summary: 'Intake: ADHD evaluation',
        description: 'Initial intake and assessment',
        location: 'Office',
        color: '#f59e0b',
        client: {
          name: 'Morgan Patel',
          dob: '1988-02-02',
          gender: 'Male',
          email: 'morgan@example.com',
          phone: '(555) 555-0188',
          address: '456 Broadway, New York, NY',
        },
        appointment: { type: 'Intake', notes: '' },
      },
    ];

    setEvents(demo);
    setSelectedEventId('demo-1');
  }, []);

  async function importFromUrl() {
    setImportError(null);
    if (!calendarUrl.trim()) {
      setImportError('Please enter an iCal URL.');
      return;
    }
    setImporting(true);
    try {
      // Fetch via our API to avoid CORS pain.
      const res = await fetch(`/api/calendar/import?url=${encodeURIComponent(calendarUrl.trim())}&offset=${tzOffsetMins}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Import failed');
      const parsed = (data.events || []).map((e: any) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      })) as CalendarEvent[];
      setEvents(parsed);
      setSelectedEventId(parsed[0]?.id || null);
      if (parsed[0]) setSelectedDay(startOfDay(parsed[0].start));
    } catch (e: any) {
      setImportError(e?.message || 'Unable to import calendar');
    } finally {
      setImporting(false);
    }
  }

  async function importFromFile(file: File) {
    setImportError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseICS(text, tzOffsetMins);
      setEvents(parsed);
      setSelectedEventId(parsed[0]?.id || null);
      if (parsed[0]) setSelectedDay(startOfDay(parsed[0].start));
    } catch (e: any) {
      setImportError(e?.message || 'Unable to import calendar');
    } finally {
      setImporting(false);
    }
  }

  function updateSelectedEvent(patch: Partial<CalendarEvent>) {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(ev => (ev.id === selectedEvent.id ? { ...ev, ...patch } : ev)));
  }

  function updateSelectedClient(patch: Partial<NonNullable<CalendarEvent['client']>>) {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(ev => (ev.id === selectedEvent.id ? { ...ev, client: { ...(ev.client || {}), ...patch } } : ev)));
  }

  function updateSelectedAppt(patch: Partial<NonNullable<CalendarEvent['appointment']>>) {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(ev => (ev.id === selectedEvent.id ? { ...ev, appointment: { ...(ev.appointment || {}), ...patch } } : ev)));
  }

  // Month grid
  const monthAnchor = useMemo(() => new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1), [selectedDay]);
  const monthLabel = monthAnchor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const startWeekday = monthAnchor.getDay(); // 0 Sun
  const daysInMonth = new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByISO = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of events) {
      const k = toISODate(ev.start);
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [events]);

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Patients</h1>
        <p className="text-gray-400 mt-1">Clinical calendar + appointment details, with iCal import and timezone correction.</p>
      </div>

      {/* Import Controls */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="text-sm text-gray-400">Import iCal via URL</label>
            <div className="flex gap-2 mt-2">
              <input
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
                placeholder="https://.../calendar.ics"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
              <button onClick={importFromUrl} disabled={importing} className="btn btn-primary">
                <span className={`material-symbols-outlined ${importing ? 'animate-spin' : ''}`}>download</span>
                Import
              </button>
            </div>
          </div>

          <div className="w-full lg:w-[320px]">
            <label className="text-sm text-gray-400">Timezone correction (minutes)</label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="range"
                min={-720}
                max={720}
                step={15}
                value={tzOffsetMins}
                onChange={(e) => setTzOffsetMins(Number(e.target.value))}
                className="w-full"
              />
              <div className="min-w-[80px] text-sm text-gray-200 text-right">{tzOffsetMins >= 0 ? '+' : ''}{tzOffsetMins}m</div>
            </div>
            <p className="text-xs text-gray-500 mt-1">If everything looks shifted, nudge this slider then re-import.</p>
          </div>

          <div className="w-full lg:w-[260px]">
            <label className="text-sm text-gray-400">Or upload .ics file</label>
            <div className="flex gap-2 mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics,text/calendar"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importFromFile(f);
                }}
              />
              <button
                className="btn btn-secondary w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <span className="material-symbols-outlined">upload</span>
                Choose file
              </button>
            </div>
          </div>
        </div>
        {importError && (
          <div className="mt-4 text-sm text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            {importError}
          </div>
        )}
      </div>

      {/* Main: Agenda + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left: Daily time agenda */}
        <div className="card lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Daily Agenda</h2>
              <p className="text-sm text-gray-400">{selectedDay.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDay(addDays(selectedDay, -1))}>
                <span className="material-symbols-outlined">chevron_left</span>
                Prev
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDay(startOfDay(new Date()))}>
                <span className="material-symbols-outlined">today</span>
                Today
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDay(addDays(selectedDay, 1))}>
                Next
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/3" style={{ height: 620 }}>
            {/* Time grid */}
            <div className="absolute inset-0">
              {slots.map((s, idx) => (
                <div
                  key={s.hour}
                  className="absolute left-0 right-0 border-t border-white/5"
                  style={{ top: `${(idx / (slots.length - 1)) * 100}%` }}
                >
                  <div className="absolute -left-1 top-[-10px] w-16 text-xs text-gray-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Events */}
            <div className="absolute inset-0 pl-16 pr-3 py-4">
              {eventsForDay.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No appointments for this day.
                </div>
              ) : (
                eventsForDay.map((ev) => {
                  const dayStart = new Date(selectedDay);
                  dayStart.setHours(6, 0, 0, 0);
                  const dayEnd = new Date(selectedDay);
                  dayEnd.setHours(20, 0, 0, 0);

                  const startH = clamp(0, hoursBetween(dayStart, ev.start), 14);
                  const endH = clamp(0, hoursBetween(dayStart, ev.end), 14);
                  const top = (startH / 14) * 100;
                  const height = Math.max(3.5, ((endH - startH) / 14) * 100);

                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`absolute left-0 right-0 text-left rounded-xl border transition shadow-sm hover:shadow-md focus:outline-none ${selectedEventId === ev.id ? 'ring-2 ring-primary' : ''}`}
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        background: `${(ev.color || '#3b82f6')}22`,
                        borderColor: `${(ev.color || '#3b82f6')}55`,
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{ev.summary}</div>
                            <div className="text-xs text-gray-300 mt-1">
                              {timeLabel(ev.start)} • {timeLabel(ev.end)}
                              {ev.location ? ` • ${ev.location}` : ''}
                            </div>
                          </div>
                          <span className="material-symbols-outlined" style={{ color: ev.color || '#3b82f6', opacity: 0.9 }}>
                            event
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Appointment + Client panel */}
        <div className="card lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Appointment Details</h2>
            {selectedEvent && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedEvent.color || '#3b82f6'}
                  onChange={(e) => updateSelectedEvent({ color: e.target.value })}
                  title="Event color"
                  className="h-9 w-10 rounded-lg border border-white/10 bg-transparent"
                />
              </div>
            )}
          </div>

          {!selectedEvent ? (
            <div className="text-gray-500">Select an appointment to view details.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400">Appointment</label>
                <input
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={selectedEvent.summary}
                  onChange={(e) => updateSelectedEvent({ summary: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-xl border border-white/10 bg-white/3 p-3">
                    <div className="text-xs text-gray-400">Start</div>
                    <div className="text-sm mt-1">{selectedEvent.start.toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/3 p-3">
                    <div className="text-xs text-gray-400">End</div>
                    <div className="text-sm mt-1">{selectedEvent.end.toLocaleString()}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-gray-400">Appointment Type</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      value={selectedEvent.appointment?.type || ''}
                      onChange={(e) => updateSelectedAppt({ type: e.target.value })}
                      placeholder="Follow-up / Intake / ..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Location</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      value={selectedEvent.location || ''}
                      onChange={(e) => updateSelectedEvent({ location: e.target.value })}
                      placeholder="Telehealth / Office / ..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Client</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={selectedEvent.client?.name || ''}
                    onChange={(e) => updateSelectedClient({ name: e.target.value })}
                    placeholder="Name"
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={selectedEvent.client?.dob || ''}
                    onChange={(e) => updateSelectedClient({ dob: e.target.value })}
                    placeholder="DOB (YYYY-MM-DD)"
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={selectedEvent.client?.gender || ''}
                    onChange={(e) => updateSelectedClient({ gender: e.target.value })}
                    placeholder="Gender"
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={selectedEvent.client?.phone || ''}
                    onChange={(e) => updateSelectedClient({ phone: e.target.value })}
                    placeholder="Phone"
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm md:col-span-2"
                    value={selectedEvent.client?.email || ''}
                    onChange={(e) => updateSelectedClient({ email: e.target.value })}
                    placeholder="Email"
                  />
                  <input
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm md:col-span-2"
                    value={selectedEvent.client?.address || ''}
                    onChange={(e) => updateSelectedClient({ address: e.target.value })}
                    placeholder="Address"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Notes</label>
                <textarea
                  className="mt-2 w-full min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  value={selectedEvent.appointment?.notes || ''}
                  onChange={(e) => updateSelectedAppt({ notes: e.target.value })}
                  placeholder="Appointment notes..."
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">Clinical Note Creator (coming next)</div>
                    <div className="text-sm text-gray-400 mt-1">
                      You said you’ll provide your note prompt next. This panel is ready to accept text/audio/video inputs and push final notes to Google Drive once connected.
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-3xl text-primary">auto_awesome</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                  <button className="btn btn-secondary btn-sm" disabled>
                    <span className="material-symbols-outlined">description</span>
                    Upload text
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled>
                    <span className="material-symbols-outlined">mic</span>
                    Upload audio
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled>
                    <span className="material-symbols-outlined">videocam</span>
                    Upload video
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Month view */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedDay(startOfDay(new Date(selectedDay.getFullYear(), selectedDay.getMonth() - 1, 1)))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="text-sm text-gray-300 min-w-[180px] text-center">{monthLabel}</div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedDay(startOfDay(new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 1)))}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="px-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="h-20 rounded-xl border border-white/5 bg-white/2" />;
            }
            const iso = toISODate(cell);
            const count = eventsByISO[iso] || 0;
            const isSelected = sameDay(cell, selectedDay);
            const isToday = sameDay(cell, new Date());

            return (
              <button
                key={iso}
                onClick={() => setSelectedDay(startOfDay(cell))}
                className={`h-20 rounded-xl border text-left p-2 transition hover:bg-white/5 ${
                  isSelected ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/3'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-gray-200'}`}>{cell.getDate()}</div>
                  {count > 0 && (
                    <div className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                      {count} appt
                    </div>
                  )}
                </div>
                {count > 0 && (
                  <div className="mt-2 text-[11px] text-gray-400">
                    {events
                      .filter(ev => sameDay(ev.start, cell))
                      .slice(0, 2)
                      .map(ev => (
                        <div key={ev.id} className="truncate">• {ev.summary}</div>
                      ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
