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
  for (let h = 8; h <= 18; h += 1) {
    const suffix = h < 12 ? 'AM' : 'PM';
    const hour12 = h === 12 ? 12 : h > 12 ? h - 12 : h;
    slots.push({ label: `${hour12} ${suffix}`, hour: h });
  }
  return slots;
}

export default function PatientsPage() {
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [tzOffsetMins, setTzOffsetMins] = useState(0);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const slots = useMemo(() => generateTimeSlots(), []);

  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentMonth]);

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

  const thisWeekEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const weekStart = addDays(today, -today.getDay());
    const weekEnd = addDays(weekStart, 7);
    return events.filter(e => e.start >= weekStart && e.start < weekEnd).length;
  }, [events]);

  useEffect(() => {
    async function loadCalendarEvents() {
      setCalendarLoading(true);
      try {
        const urlsRes = await fetch('/api/calendar/urls');
        const urlsData = await urlsRes.json();

        if (!urlsData.ok || !urlsData.urls || urlsData.urls.length === 0) {
          setEvents([]);
          setSelectedEventId(null);
          setCalendarLoading(false);
          return;
        }

        const allEvents: CalendarEvent[] = [];

        for (const url of urlsData.urls) {
          try {
            const importRes = await fetch(
              `/api/calendar/import?url=${encodeURIComponent(url)}&offset=${tzOffsetMins}`
            );
            const importData = await importRes.json();

            if (importData.ok && importData.events) {
              const parsed = importData.events.map((e: any) => ({
                ...e,
                start: new Date(e.start),
                end: new Date(e.end),
              })) as CalendarEvent[];
              allEvents.push(...parsed);
            }
          } catch (e) {
            console.error(`Failed to import calendar from ${url}:`, e);
          }
        }

        allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
        setEvents(allEvents);
        setSelectedEventId(allEvents[0]?.id || null);
        if (allEvents[0]) setSelectedDay(startOfDay(allEvents[0].start));
      } catch (e) {
        console.error('Failed to load calendar events:', e);
        setEvents([]);
        setSelectedEventId(null);
      } finally {
        setCalendarLoading(false);
      }
    }

    loadCalendarEvents();
  }, [tzOffsetMins]);

  async function importFromUrl() {
    setImportError(null);
    if (!calendarUrl.trim()) {
      setImportError('Please enter an iCal URL.');
      return;
    }
    setImporting(true);
    try {
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

  return (
    <div className="container py-6">
      {/* Header */}
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Combined Clinical Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Clinical calendar • appointment details, with EHR import and timeline correction.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            Settings
          </button>
        </div>
      </header>

      {/* Import Panel */}
      {showImportPanel && (
        <div className="card mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-400">Import iCal via URL</label>
              <div className="flex gap-2 mt-2">
                <input
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  placeholder="https://.../calendar.ics"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
                <button onClick={importFromUrl} disabled={importing} className="btn btn-primary">
                  <span className={`material-symbols-outlined ${importing ? 'animate-spin' : ''}`}>download</span>
                  Import
                </button>
              </div>
            </div>
            <div className="w-full lg:w-[280px]">
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
                <div className="min-w-[60px] text-sm text-gray-200 text-right">{tzOffsetMins >= 0 ? '+' : ''}{tzOffsetMins}m</div>
              </div>
            </div>
            <div className="w-full lg:w-[200px]">
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
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Today's Appointments - Blue glow */}
        <div 
          className="rounded-xl p-5 relative overflow-hidden bg-[#181b21]"
          style={{
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.3), inset 0 0 8px rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.5)'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 text-sm font-medium">Today's Appointments</span>
            <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
              <span className="material-symbols-outlined text-lg">event</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{eventsForDay.length}</div>
        </div>

        {/* Pending Notes - Red glow */}
        <div 
          className="rounded-xl p-5 relative overflow-hidden bg-[#181b21]"
          style={{
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.3), inset 0 0 8px rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.5)'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 text-sm font-medium">Pending Notes</span>
            <div className="p-1.5 bg-red-500/10 rounded text-red-400">
              <span className="material-symbols-outlined text-lg">description</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">6</div>
        </div>

        {/* This Week's Appointments - Blue glow */}
        <div 
          className="rounded-xl p-5 relative overflow-hidden bg-[#181b21]"
          style={{
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.3), inset 0 0 8px rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.5)'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 text-sm font-medium">This Week's Appointments</span>
            <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{thisWeekEvents}</div>
        </div>

        {/* Today's Revenue - Green glow */}
        <div 
          className="rounded-xl p-5 relative overflow-hidden bg-[#181b21]"
          style={{
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3), inset 0 0 8px rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.5)'
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 text-sm font-medium">Today's Revenue</span>
            <div className="p-1.5 bg-green-500/10 rounded text-green-400">
              <span className="material-symbols-outlined text-lg">attach_money</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white">$196.70</div>
        </div>
      </div>

      {/* Main Grid: Agenda + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Agenda */}
        <div className="lg:col-span-7 card min-h-[700px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Daily Agenda</h2>
              <p className="text-sm text-gray-400">{selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-1 text-sm bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setSelectedDay(addDays(selectedDay, -1))}
                className="px-3 py-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span> Prev
              </button>
              <button
                onClick={() => setSelectedDay(startOfDay(new Date()))}
                className="px-3 py-1.5 bg-white/10 rounded text-white font-medium"
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDay(addDays(selectedDay, 1))}
                className="px-3 py-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-1 transition"
              >
                Next <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative pr-2">
            {calendarLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 rounded-full border-2 border-gray-600 border-t-blue-500 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-400">Loading calendar...</p>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-4xl text-blue-400">event</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">No calendar connected</h3>
                  <p className="text-sm text-gray-400 mb-4">Import a calendar to see your appointments</p>
                  <button
                    onClick={() => setShowImportPanel(true)}
                    className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium transition"
                  >
                    <span className="material-symbols-outlined inline text-base align-middle mr-1.5">add</span>
                    Import Calendar
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative" style={{ minHeight: `${slots.length * 64}px` }}>
                {/* Time slots */}
                {slots.map((s, idx) => (
                  <div
                    key={s.hour}
                    className="border-t border-white/5 h-16 relative"
                  >
                    <span className="absolute left-0 top-1 text-xs text-gray-500 font-mono w-12">
                      {s.label}
                    </span>
                  </div>
                ))}

                {/* Event blocks */}
                {eventsForDay.map((ev) => {
                  const dayStart = new Date(selectedDay);
                  dayStart.setHours(8, 0, 0, 0);
                  const totalHours = slots.length;

                  const startH = clamp(0, hoursBetween(dayStart, ev.start), totalHours);
                  const endH = clamp(0, hoursBetween(dayStart, ev.end), totalHours);
                  const top = startH * 64;
                  const height = Math.max(50, (endH - startH) * 64);

                  const summaryLower = (ev.summary || '').toLowerCase();
                  const locationLower = (ev.location || '').toLowerCase();
                  const isTelehealth = locationLower.includes('tele') || summaryLower.includes('telehealth') || summaryLower.includes('video');
                  const isIntake = summaryLower.includes('intake') || summaryLower.includes('evaluation') || summaryLower.includes('assessment');
                  
                  const bgColor = isIntake ? 'bg-red-500' : 'bg-blue-500';
                  const borderColor = isIntake ? 'border-red-400' : 'border-blue-400';
                  const textSecondary = isIntake ? 'text-red-100' : 'text-blue-100';

                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`absolute left-14 right-2 rounded-lg p-3 shadow-lg z-10 border text-left transition-all hover:scale-[1.01] ${bgColor} ${borderColor} ${selectedEventId === ev.id ? 'ring-2 ring-white/50' : ''}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="flex justify-between items-start text-white">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{ev.summary}</h3>
                          <p className={`text-xs mt-0.5 ${textSecondary}`}>
                            {timeLabel(ev.start)} - {timeLabel(ev.end)} | {ev.location || 'No location'}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-white/70 text-sm flex-shrink-0">
                          {isTelehealth ? 'videocam' : 'assignment_ind'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="lg:col-span-5 card min-h-[700px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Appointment Details</h2>
            {selectedEvent && (
              <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center cursor-pointer hover:bg-blue-500/30 transition">
                <span className="material-symbols-outlined text-sm">edit</span>
              </div>
            )}
          </div>

          {!selectedEvent ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select an appointment to view details.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Patient Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Patient Name</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedEvent.client?.name || ''}
                  onChange={(e) => updateSelectedClient({ name: e.target.value })}
                />
              </div>

              {/* Start/End */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Start</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200">
                    {selectedEvent.start.toLocaleDateString()}, {timeLabel(selectedEvent.start)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">End</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200">
                    {selectedEvent.end.toLocaleDateString()}, {timeLabel(selectedEvent.end)}
                  </div>
                </div>
              </div>

              {/* Type/Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Appointment Type</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={selectedEvent.appointment?.type || ''}
                    onChange={(e) => updateSelectedAppt({ type: e.target.value })}
                    placeholder="Follow-up"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Location</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={selectedEvent.location || ''}
                    onChange={(e) => updateSelectedEvent({ location: e.target.value })}
                    placeholder="Telehealth"
                  />
                </div>
              </div>

              {/* Client Section */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-gray-400 mb-3">CLIENT</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={selectedEvent.client?.gender || ''}
                    onChange={(e) => updateSelectedClient({ gender: e.target.value })}
                    placeholder="Gender"
                  />
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={selectedEvent.client?.dob || ''}
                    onChange={(e) => updateSelectedClient({ dob: e.target.value })}
                    placeholder="DOB (YYYY-MM-DD)"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="relative">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedEvent.client?.phone || ''}
                  onChange={(e) => updateSelectedClient({ phone: e.target.value })}
                  placeholder="Phone"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">call</span>
              </div>

              {/* Email */}
              <div className="relative">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedEvent.client?.email || ''}
                  onChange={(e) => updateSelectedClient({ email: e.target.value })}
                  placeholder="Email"
                />
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">mail</span>
              </div>

              {/* Address */}
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={selectedEvent.client?.address || ''}
                onChange={(e) => updateSelectedClient({ address: e.target.value })}
                placeholder="Address"
              />

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Appointment notes...</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedEvent.appointment?.notes || ''}
                  onChange={(e) => updateSelectedAppt({ notes: e.target.value })}
                  placeholder="Type notes here..."
                />
              </div>

              {/* Save Button */}
              <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-lg font-medium transition shadow-lg">
                Save Changes
              </button>

              {/* Generate Clinical Note Button */}
              <a
                href={`/noteai?appointmentId=${selectedEvent.id}`}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-medium transition shadow-lg flex items-center justify-center gap-2 mt-3"
              >
                <span className="material-symbols-outlined">description</span>
                Generate Clinical Note
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Month Calendar View */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Month View</h2>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isToday = sameDay(day, new Date());
            const isSelected = sameDay(day, selectedDay);
            const dayEvents = events.filter((ev) => sameDay(ev.start, day));
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`relative aspect-square p-1 rounded-lg text-sm transition flex flex-col items-center justify-start
                  ${!isCurrentMonth ? 'text-gray-600' : 'text-gray-300'}
                  ${isToday ? 'bg-blue-500/20 text-blue-400 font-bold' : ''}
                  ${isSelected ? 'ring-2 ring-purple-500 bg-purple-500/10' : 'hover:bg-white/5'}
                `}
              >
                <span className="text-xs">{day.getDate()}</span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map((ev, i) => {
                      const summaryLower = (ev.summary || '').toLowerCase();
                      const isIntake = summaryLower.includes('intake') || summaryLower.includes('evaluation') || summaryLower.includes('assessment');
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${isIntake ? 'bg-red-500' : 'bg-blue-500'}`}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-gray-400">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="px-3 py-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-1 transition"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span> Prev Month
          </button>
          <span className="text-sm font-medium text-white">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="px-3 py-1.5 rounded text-gray-400 hover:text-white hover:bg-white/5 flex items-center gap-1 transition"
          >
            Next Month <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Calendar Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Import Section */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">upload</span>
                  Import Calendar
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Import from URL</label>
                    <div className="flex gap-2">
                      <input
                        value={calendarUrl}
                        onChange={(e) => setCalendarUrl(e.target.value)}
                        placeholder="https://.../calendar.ics"
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      />
                      <button onClick={importFromUrl} disabled={importing} className="btn btn-primary text-sm px-3">
                        {importing ? 'Loading...' : 'Import'}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Or upload .ics file</label>
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
                      className="btn btn-secondary w-full text-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importing}
                    >
                      Choose file
                    </button>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Timezone correction: {tzOffsetMins >= 0 ? '+' : ''}{tzOffsetMins} minutes</label>
                    <input
                      type="range"
                      min={-720}
                      max={720}
                      step={15}
                      value={tzOffsetMins}
                      onChange={(e) => setTzOffsetMins(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Color Coding */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">palette</span>
                  Color Coding
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span className="text-sm text-gray-300 flex-1">Telehealth / Follow-up</span>
                    <span className="text-xs text-gray-500">Default</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-sm text-gray-300 flex-1">Intake / Evaluation / Assessment</span>
                    <span className="text-xs text-gray-500">Keywords</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Colors are automatically assigned based on appointment title keywords.
                  </p>
                </div>
              </div>

              {/* Display Options */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">tune</span>
                  Display Options
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-gray-600 text-blue-500 focus:ring-blue-500" />
                    <span className="text-sm text-gray-300">Show appointment location</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 bg-white/5 rounded-lg cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-gray-600 text-blue-500 focus:ring-blue-500" />
                    <span className="text-sm text-gray-300">Show time on calendar dots</span>
                  </label>
                </div>
              </div>
            </div>

            {importError && (
              <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                {importError}
              </div>
            )}

            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-lg font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
