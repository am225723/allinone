'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CalendarEntry = {
  url: string;
  name: string;
  color: string;
  enabled: boolean;
};

type CalendarEvent = {
  id: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  color?: string;
  calendarName?: string;
  calendarColor?: string;
  calendarDisplayName?: string;
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
  _side?: 'left' | 'right';
};

const TIMEZONE_OPTIONS = [
  { label: 'Auto (Browser)', value: 'auto', offset: 0 },
  { label: 'US Eastern (ET)', value: 'America/New_York', offset: 0 },
  { label: 'US Central (CT)', value: 'America/Chicago', offset: 0 },
  { label: 'US Mountain (MT)', value: 'America/Denver', offset: 0 },
  { label: 'US Pacific (PT)', value: 'America/Los_Angeles', offset: 0 },
  { label: 'US Alaska', value: 'America/Anchorage', offset: 0 },
  { label: 'US Hawaii', value: 'Pacific/Honolulu', offset: 0 },
  { label: 'UTC', value: 'UTC', offset: 0 },
  { label: 'Custom offset', value: 'custom', offset: 0 },
];

function getTimezoneOffsetMinutes(tz: string): number {
  if (tz === 'auto' || tz === 'custom') return 0;
  try {
    const now = new Date();
    const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = now.toLocaleString('en-US', { timeZone: tz });
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return 0;
  }
}

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

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  dob: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gender?: string | null;
};

export default function PatientsPage() {
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState('auto');
  const [customOffsetMins, setCustomOffsetMins] = useState(0);
  const tzOffsetMins = selectedTimezone === 'custom' ? customOffsetMins : getTimezoneOffsetMinutes(selectedTimezone);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [savedCalendars, setSavedCalendars] = useState<CalendarEntry[]>([]);
  const [newCalName, setNewCalName] = useState('');
  const [newCalUrl, setNewCalUrl] = useState('');
  const [newCalColor, setNewCalColor] = useState('#3b82f6');
  const [savingCalendars, setSavingCalendars] = useState(false);
  const [calendarReloadKey, setCalendarReloadKey] = useState(0);
  const [appointmentTypes, setAppointmentTypes] = useState<{id: string; name: string; platform: string; active: boolean}[]>([]);
  const [practiceLocations, setPracticeLocations] = useState<{id: string; name: string; type: string; active: boolean}[]>([]);
  const [leftCalendarName, setLeftCalendarName] = useState('Calendar 1');
  const [rightCalendarName, setRightCalendarName] = useState('Calendar 2');
  const [leftCalendarId, setLeftCalendarId] = useState<string | null>(null);
  const [rightCalendarId, setRightCalendarId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);
  const [leftDisplayOptions, setLeftDisplayOptions] = useState({
    showTime: true,
    showLocation: true,
    showCalendarName: true,
  });
  const [rightDisplayOptions, setRightDisplayOptions] = useState({
    showTime: true,
    showLocation: true,
    showCalendarName: true,
  });
  const [leftTimeOffset, setLeftTimeOffset] = useState(0);
  const [rightTimeOffset, setRightTimeOffset] = useState(0);
  const [appointmentTypeColors, setAppointmentTypeColors] = useState<{[key: string]: string}>({
    'intake': '#ef4444',
    'evaluation': '#ef4444',
    'assessment': '#ef4444',
    'follow-up': '#3b82f6',
    'followup': '#3b82f6',
    'therapy': '#8b5cf6',
    'medication': '#10b981',
    'consultation': '#f59e0b',
    'default': '#3b82f6',
  });
  const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  function getAppointmentTypeColor(summary: string, calendarColor?: string): string {
    if (calendarColor) return calendarColor;
    
    const summaryLower = summary.toLowerCase();
    
    for (const [type, color] of Object.entries(appointmentTypeColors)) {
      if (type !== 'default' && summaryLower.includes(type)) {
        return color;
      }
    }
    
    return appointmentTypeColors.default;
  }

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
    const dayEvents = events
      .filter(e => sameDay(e.start, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Split events between left and right based on calendar selection
    // If no specific calendar is selected, alternate events
    // If specific calendars are selected, filter accordingly
    
    let leftEvents: CalendarEvent[] = [];
    let rightEvents: CalendarEvent[] = [];

    if (leftCalendarId && rightCalendarId) {
      // Both calendars selected - filter each to its side
      leftEvents = dayEvents.filter(e => e.calendarName === leftCalendarId);
      rightEvents = dayEvents.filter(e => e.calendarName === rightCalendarId);
    } else if (leftCalendarId) {
      // Only left calendar selected
      leftEvents = dayEvents.filter(e => e.calendarName === leftCalendarId);
      rightEvents = dayEvents.filter(e => e.calendarName !== leftCalendarId);
    } else if (rightCalendarId) {
      // Only right calendar selected
      rightEvents = dayEvents.filter(e => e.calendarName === rightCalendarId);
      leftEvents = dayEvents.filter(e => e.calendarName !== rightCalendarId);
    } else {
      // No specific selection - alternate events
      dayEvents.forEach((ev, idx) => {
        if (idx % 2 === 0) {
          leftEvents.push(ev);
        } else {
          rightEvents.push(ev);
        }
      });
    }

    // Return combined array with left events first (even indices), then right events (odd indices)
    const combined: CalendarEvent[] = [];
    const maxLen = Math.max(leftEvents.length, rightEvents.length);
    for (let i = 0; i < maxLen; i++) {
      if (leftEvents[i]) combined.push({ ...leftEvents[i], _side: 'left' as const });
      if (rightEvents[i]) combined.push({ ...rightEvents[i], _side: 'right' as const });
    }

    return combined;
  }, [events, selectedDay, leftCalendarId, rightCalendarId]);

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
    async function loadSettingsData() {
      try {
        const [typesRes, locsRes] = await Promise.all([
          fetch('/api/settings/appointment-types'),
          fetch('/api/settings/locations'),
        ]);
        const typesData = await typesRes.json();
        const locsData = await locsRes.json();
        if (typesData.ok) setAppointmentTypes((typesData.types || []).filter((t: any) => t.active));
        if (locsData.ok) setPracticeLocations((locsData.locations || []).filter((l: any) => l.active));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
    loadSettingsData();
  }, []);

  useEffect(() => {
    async function loadClients() {
      setLoadingClients(true);
      try {
        const res = await fetch('/api/clients?status=active&pageSize=100');
        const data = await res.json();
        if (data.ok) {
          setClients(data.clients || []);
        }
      } catch (e) {
        console.error('Failed to load clients:', e);
      }
      setLoadingClients(false);
    }
    loadClients();
  }, []);

  useEffect(() => {
    async function loadCalendarEvents() {
      setCalendarLoading(true);
      try {
        const urlsRes = await fetch('/api/calendar/urls');
        const urlsData = await urlsRes.json();

        const calendars: CalendarEntry[] = urlsData.calendars || [];
        setSavedCalendars(calendars);

        const enabledCalendars = calendars.filter(c => c.enabled);

        if (enabledCalendars.length === 0) {
          setEvents([]);
          setSelectedEventId(null);
          setCalendarLoading(false);
          return;
        }

        const allEvents: CalendarEvent[] = [];

        for (const cal of enabledCalendars) {
          try {
            const importRes = await fetch(
              `/api/calendar/import?url=${encodeURIComponent(cal.url)}&offset=${tzOffsetMins}`
            );
            const importData = await importRes.json();

            if (importData.ok && importData.events) {
              const parsed = importData.events.map((e: any) => ({
                ...e,
                start: new Date(e.start),
                end: new Date(e.end),
                calendarName: cal.url, // Use URL for matching, name is separate
                calendarColor: cal.color,
                calendarDisplayName: cal.name, // Store display name separately
              })) as CalendarEvent[];
              allEvents.push(...parsed);
            }
          } catch (e) {
            console.error(`Failed to import calendar from ${cal.url}:`, e);
          }
        }

        allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
        setEvents(allEvents);
        const todayEvents = allEvents.filter(e => sameDay(e.start, new Date()));
        if (todayEvents.length > 0) {
          setSelectedEventId(todayEvents[0].id);
          setSelectedDay(startOfDay(new Date()));
        } else if (allEvents.length > 0) {
          setSelectedEventId(allEvents[0].id);
          setSelectedDay(startOfDay(allEvents[0].start));
        }
      } catch (e) {
        console.error('Failed to load calendar events:', e);
        setEvents([]);
        setSelectedEventId(null);
      } finally {
        setCalendarLoading(false);
      }
    }

    loadCalendarEvents();
  }, [tzOffsetMins, calendarReloadKey]);

  async function persistCalendars(cals: CalendarEntry[]) {
    setSavingCalendars(true);
    try {
      const res = await fetch('/api/calendar/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendars: cals }),
      });
      if (res.ok) {
        setSavedCalendars(cals);
        setCalendarReloadKey(k => k + 1);
      }
    } catch (e) {
      console.error('Failed to save calendars:', e);
    } finally {
      setSavingCalendars(false);
    }
  }

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

      const newCal: CalendarEntry = {
        url: calendarUrl.trim(),
        name: `Calendar ${savedCalendars.length + 1}`,
        color: PRESET_COLORS[savedCalendars.length % PRESET_COLORS.length],
        enabled: true,
      };
      const updated = [...savedCalendars, newCal];
      await persistCalendars(updated);
      setCalendarUrl('');
      setShowImportPanel(false);
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

  function attachClientToEvent(client: Client) {
    if (!selectedEvent) return;
    
    setEvents(prev => prev.map(ev => {
      if (ev.id === selectedEvent.id) {
        return {
          ...ev,
          client: {
            name: `${client.first_name} ${client.last_name}`,
            dob: client.dob || '',
            address: client.address || '',
            gender: client.gender || '',
            email: client.email || '',
            phone: client.phone || '',
          },
          // Update event title to patient name if it's a generic title
          summary: ev.summary === 'Appointment' || !ev.summary ? `${client.first_name} ${client.last_name}` : ev.summary,
        };
      }
      return ev;
    }));
    
    setShowClientModal(false);
    setClientSearch('');
  }

  const filteredClients = clients.filter(client => {
    const search = clientSearch.toLowerCase();
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    return fullName.includes(search) || 
           client.first_name.toLowerCase().includes(search) ||
           client.last_name.toLowerCase().includes(search);
  });

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
              <label className="text-sm text-gray-400">Timezone</label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              {selectedTimezone === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="range"
                    min={-720}
                    max={720}
                    step={15}
                    value={customOffsetMins}
                    onChange={(e) => setCustomOffsetMins(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="min-w-[60px] text-sm text-gray-200 text-right">{customOffsetMins >= 0 ? '+' : ''}{customOffsetMins}m</div>
                </div>
              )}
              {selectedTimezone !== 'custom' && selectedTimezone !== 'auto' && (
                <p className="text-xs text-gray-500 mt-1">UTC {tzOffsetMins >= 0 ? '+' : ''}{Math.floor(tzOffsetMins / 60)}:{String(Math.abs(tzOffsetMins % 60)).padStart(2, '0')}</p>
              )}
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
        {/* Daily Agenda - Split into two columns for different calendars */}
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
              <div className="grid grid-cols-2 gap-4" style={{ minHeight: `${slots.length * 64}px` }}>
                {/* Left Column - First Calendar */}
                <div className="relative" style={{ minHeight: `${slots.length * 64}px` }}>
                  <div className="mb-2 pb-2 border-b border-white/10" style={{ height: '40px' }}>
                    <span className="text-xs font-medium text-white">
                      {leftCalendarName}
                    </span>
                  </div>

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

                  {/* Event blocks for calendar 1 (left side) */}
                  {eventsForDay
                    .filter((ev) => ev._side === 'left')
                    .map((ev) => {
                      const dayStart = new Date(selectedDay);
                      dayStart.setHours(8, 0, 0, 0);
                      const totalHours = slots.length;
                      const HEADER_HEIGHT = 48; // Account for calendar name and settings

                      // Apply time offset for left calendar
                      const adjustedStart = new Date(ev.start.getTime() + leftTimeOffset * 60000);
                      const adjustedEnd = new Date(ev.end.getTime() + leftTimeOffset * 60000);

                      const startH = clamp(0, hoursBetween(dayStart, adjustedStart), totalHours);
                      const endH = clamp(0, hoursBetween(dayStart, adjustedEnd), totalHours);
                      const top = HEADER_HEIGHT + (startH * 64);
                      const height = Math.max(50, (endH - startH) * 64);

                      const summaryLower = (ev.summary || '').toLowerCase();
                      const locationLower = (ev.location || '').toLowerCase();
                      const isTelehealth = locationLower.includes('tele') || summaryLower.includes('telehealth') || summaryLower.includes('video');
                      
                      const calColor = getAppointmentTypeColor(ev.summary, ev.calendarColor);

                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEventId(ev.id)}
                          className={`absolute left-14 right-2 rounded-lg p-3 shadow-lg z-10 border text-left transition-all hover:scale-[1.01] ${selectedEventId === ev.id ? 'ring-2 ring-white/50' : ''}`}
                          style={{ top: `${top}px`, height: `${height}px`, backgroundColor: calColor, borderColor: calColor }}
                        >
                          <div className="flex justify-between items-start text-white">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{ev.summary}</h3>
                              <p className="text-xs mt-0.5 text-white/80">
                                {leftDisplayOptions.showTime && `${timeLabel(adjustedStart)} - ${timeLabel(adjustedEnd)} `}
                                {leftDisplayOptions.showTime && leftDisplayOptions.showLocation && '| '}
                                {leftDisplayOptions.showLocation && (ev.location || 'No location')}
                              </p>
                              {leftDisplayOptions.showCalendarName && ev.calendarDisplayName && (
                                <p className="text-[10px] mt-0.5 text-white/60">{ev.calendarDisplayName}</p>
                              )}
                            </div>
                            <span className="material-symbols-outlined text-white/70 text-sm flex-shrink-0">
                              {isTelehealth ? 'videocam' : 'assignment_ind'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Right Column - Second Calendar - No time slots */}
                <div className="relative" style={{ minHeight: `${slots.length * 64}px` }}>
                  <div className="mb-2 pb-2 border-b border-white/10">
                    <span className="text-xs font-medium text-white">
                      {rightCalendarName}
                    </span>
                  </div>

                  {/* No time slots for right calendar - events listed vertically */}

                  {/* Event blocks for calendar 2 (right side) - time-based positioning */}
                  {eventsForDay
                    .filter((ev) => ev._side === 'right')
                    .map((ev) => {
                      const dayStart = new Date(selectedDay);
                      dayStart.setHours(8, 0, 0, 0);
                      const totalHours = slots.length;
                      const HEADER_HEIGHT = 48; // Account for calendar name and settings

                      // Apply time offset for right calendar
                      const adjustedStart = new Date(ev.start.getTime() + rightTimeOffset * 60000);
                      const adjustedEnd = new Date(ev.end.getTime() + rightTimeOffset * 60000);

                      const startH = clamp(0, hoursBetween(dayStart, adjustedStart), totalHours);
                      const endH = clamp(0, hoursBetween(dayStart, adjustedEnd), totalHours);
                      const top = HEADER_HEIGHT + (startH * 64);
                      const height = Math.max(50, (endH - startH) * 64);

                      const summaryLower = (ev.summary || '').toLowerCase();
                      const locationLower = (ev.location || '').toLowerCase();
                      const isTelehealth = locationLower.includes('tele') || summaryLower.includes('telehealth') || summaryLower.includes('video');
                      
                      const calColor = getAppointmentTypeColor(ev.summary, ev.calendarColor);

                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEventId(ev.id)}
                          className={`absolute left-0 right-2 rounded-lg p-3 shadow-lg z-10 border text-left transition-all hover:scale-[1.01] ${selectedEventId === ev.id ? 'ring-2 ring-white/50' : ''}`}
                          style={{ top: `${top}px`, height: `${height}px`, backgroundColor: calColor, borderColor: calColor }}
                        >
                          <div className="flex justify-between items-start text-white">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{ev.summary}</h3>
                              <p className="text-xs mt-0.5 text-white/80">
                                {rightDisplayOptions.showTime && `${timeLabel(adjustedStart)} - ${timeLabel(adjustedEnd)} `}
                                {rightDisplayOptions.showTime && rightDisplayOptions.showLocation && '| '}
                                {rightDisplayOptions.showLocation && (ev.location || 'No location')}
                              </p>
                              {rightDisplayOptions.showCalendarName && ev.calendarDisplayName && (
                                <p className="text-[10px] mt-0.5 text-white/60">{ev.calendarDisplayName}</p>
                              )}
                            </div>
                            <span className="material-symbols-outlined text-white/70 text-sm flex-shrink-0">
                              {isTelehealth ? 'videocam' : 'assignment_ind'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appointment Details */}
        <div className="lg:col-span-5 card min-h-[700px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-white">Appointment Details</h2>
            {selectedEvent && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClientModal(true)}
                  className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center cursor-pointer hover:bg-emerald-500/30 transition"
                  title="Attach Client"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                </button>
                <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center cursor-pointer hover:bg-blue-500/30 transition">
                  <span className="material-symbols-outlined text-sm">edit</span>
                </div>
              </div>
            )}
          </div>

          {!selectedEvent ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select an appointment to view details.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Calendar Source */}
              {selectedEvent.calendarDisplayName && (
                <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg mb-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedEvent.calendarColor || '#3b82f6' }} />
                  <span className="text-xs text-gray-400">{selectedEvent.calendarDisplayName}</span>
                </div>
              )}

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
                  {appointmentTypes.length > 0 ? (
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={selectedEvent.appointment?.type || ''}
                      onChange={(e) => updateSelectedAppt({ type: e.target.value })}
                    >
                      <option value="">Select type...</option>
                      {appointmentTypes.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={selectedEvent.appointment?.type || ''}
                      onChange={(e) => updateSelectedAppt({ type: e.target.value })}
                      placeholder="Follow-up"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Location</label>
                  {practiceLocations.length > 0 ? (
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={selectedEvent.location || ''}
                      onChange={(e) => updateSelectedEvent({ location: e.target.value })}
                    >
                      <option value="">Select location...</option>
                      {practiceLocations.map((l) => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={selectedEvent.location || ''}
                      onChange={(e) => updateSelectedEvent({ location: e.target.value })}
                      placeholder="Telehealth"
                    />
                  )}
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
                className={`relative min-h-[80px] p-1 rounded-lg text-sm transition flex flex-col items-start
                  ${!isCurrentMonth ? 'text-gray-600' : 'text-gray-300'}
                  ${isToday ? 'bg-blue-500/20 text-blue-400 font-bold' : ''}
                  ${isSelected ? 'ring-2 ring-purple-500 bg-purple-500/10' : 'hover:bg-white/5'}
                `}
              >
                <span className="text-xs self-center mb-0.5">{day.getDate()}</span>
                {hasEvents && (
                  <div className="w-full space-y-px overflow-hidden flex-1">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-0.5 px-0.5 rounded text-[9px] leading-tight truncate"
                        style={{ color: ev.calendarColor || '#3b82f6' }}
                      >
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: ev.calendarColor || '#3b82f6' }} />
                        <span className="font-medium flex-shrink-0">
                          {ev.start.getHours() === 0 && ev.start.getMinutes() === 0 ? '' : `${ev.start.getHours() % 12 || 12}${ev.start.getMinutes() > 0 ? ':' + pad2(ev.start.getMinutes()) : ''}${ev.start.getHours() >= 12 ? 'p' : 'a'}`}
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-gray-400 pl-1">+{dayEvents.length - 3} more</span>
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

        {savedCalendars.filter(c => c.enabled).length > 1 && (
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
            {savedCalendars.filter(c => c.enabled).map((cal, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cal.color }} />
                <span className="text-xs text-gray-400">{cal.name}</span>
              </div>
            ))}
          </div>
        )}
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
              {/* Saved Calendars */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">event</span>
                  Connected Calendars ({savedCalendars.length})
                </h4>
                {savedCalendars.length === 0 ? (
                  <div className="p-4 bg-white/5 rounded-lg text-center text-gray-400 text-sm">
                    No calendars connected. Add one below.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedCalendars.map((cal, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg group">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{cal.name}</p>
                          <p className="text-xs text-gray-500 truncate">{cal.url}</p>
                        </div>
                        <button
                          onClick={() => {
                            const updated = [...savedCalendars];
                            updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                            persistCalendars(updated);
                          }}
                          className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${cal.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${cal.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <button
                          onClick={() => {
                            const updated = savedCalendars.filter((_, i) => i !== idx);
                            persistCalendars(updated);
                          }}
                          className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {savingCalendars && (
                  <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Saving...
                  </p>
                )}
              </div>

              {/* Add New Calendar */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">add_circle</span>
                  Add Calendar
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Calendar Name</label>
                    <input
                      value={newCalName}
                      onChange={(e) => setNewCalName(e.target.value)}
                      placeholder="Work Calendar"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">iCal URL</label>
                    <input
                      value={newCalUrl}
                      onChange={(e) => setNewCalUrl(e.target.value)}
                      placeholder="https://.../calendar.ics"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Color</label>
                    <div className="flex gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewCalColor(c)}
                          className={`w-7 h-7 rounded-full transition-all ${newCalColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d24] scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!newCalUrl.trim()) return;
                      const updated = [...savedCalendars, {
                        url: newCalUrl.trim(),
                        name: newCalName.trim() || `Calendar ${savedCalendars.length + 1}`,
                        color: newCalColor,
                        enabled: true,
                      }];
                      await persistCalendars(updated);
                      setNewCalName('');
                      setNewCalUrl('');
                      setNewCalColor(PRESET_COLORS[(updated.length) % PRESET_COLORS.length]);
                    }}
                    disabled={!newCalUrl.trim() || savingCalendars}
                    className="w-full py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Calendar
                  </button>
                </div>
              </div>

              {/* Upload ICS File */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">upload_file</span>
                  Upload .ics File
                </h4>
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
                  className="w-full py-2 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-lg text-sm transition"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : 'Choose .ics file'}
                </button>
              </div>

              {/* Timezone */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">schedule</span>
                  Timezone
                </h4>
                <select
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                {selectedTimezone === 'custom' && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-400 mb-1 block">
                      Offset: {customOffsetMins >= 0 ? '+' : ''}{Math.round(customOffsetMins)} minutes
                    </label>
                    <input
                      type="range"
                      min={-720}
                      max={720}
                      step={15}
                      value={customOffsetMins}
                      onChange={(e) => setCustomOffsetMins(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
                {selectedTimezone !== 'custom' && selectedTimezone !== 'auto' && (
                  <p className="text-xs text-gray-500 mt-1">UTC {tzOffsetMins >= 0 ? '+' : ''}{Math.floor(tzOffsetMins / 60)}:{String(Math.abs(tzOffsetMins % 60)).padStart(2, '0')}</p>
                )}
              </div>

              {/* Daily Agenda Settings */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">calendar_view_day</span>
                  Daily Agenda Settings
                </h4>

                {/* Calendar Selection */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Left Calendar Source</label>
                    <select
                      value={leftCalendarId || ''}
                      onChange={(e) => setLeftCalendarId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Calendars</option>
                      {savedCalendars.filter(c => c.enabled).map(cal => (
                        <option key={cal.url} value={cal.url}>{cal.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Right Calendar Source</label>
                    <select
                      value={rightCalendarId || ''}
                      onChange={(e) => setRightCalendarId(e.target.value || null)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Calendars</option>
                      {savedCalendars.filter(c => c.enabled).map(cal => (
                        <option key={cal.url} value={cal.url}>{cal.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Calendar Names */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Left Calendar Name</label>
                    <input
                      type="text"
                      value={leftCalendarName}
                      onChange={(e) => setLeftCalendarName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Right Calendar Name</label>
                    <input
                      type="text"
                      value={rightCalendarName}
                      onChange={(e) => setRightCalendarName(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Time Adjustments */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Left Calendar Time Adjustment</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-720"
                        max="720"
                        step="15"
                        value={leftTimeOffset}
                        onChange={(e) => setLeftTimeOffset(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="min-w-[60px] text-xs text-gray-200 text-right">
                        {leftTimeOffset >= 0 ? '+' : ''}{leftTimeOffset}m
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Right Calendar Time Adjustment</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-720"
                        max="720"
                        step="15"
                        value={rightTimeOffset}
                        onChange={(e) => setRightTimeOffset(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="min-w-[60px] text-xs text-gray-200 text-right">
                        {rightTimeOffset >= 0 ? '+' : ''}{rightTimeOffset}m
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display Options */}
                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-2 block">Display Options</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={leftDisplayOptions.showTime}
                          onChange={(e) => setLeftDisplayOptions({...leftDisplayOptions, showTime: e.target.checked})}
                          className="rounded bg-white/10 border-white/20"
                        />
                        Left Calendar: Show Time
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={rightDisplayOptions.showTime}
                          onChange={(e) => setRightDisplayOptions({...rightDisplayOptions, showTime: e.target.checked})}
                          className="rounded bg-white/10 border-white/20"
                        />
                        Right: Show Time
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={leftDisplayOptions.showLocation}
                          onChange={(e) => setLeftDisplayOptions({...leftDisplayOptions, showLocation: e.target.checked})}
                          className="rounded bg-white/10 border-white/20"
                        />
                        Left Calendar: Show Location
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={rightDisplayOptions.showLocation}
                          onChange={(e) => setRightDisplayOptions({...rightDisplayOptions, showLocation: e.target.checked})}
                          className="rounded bg-white/10 border-white/20"
                        />
                        Right: Show Location
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={leftDisplayOptions.showCalendarName}
                          onChange={(e) => setLeftDisplayOptions({...leftDisplayOptions, showCalendarName: e.target.checked})}
                          className="rounded bg-white/10 border-white/20"
                        />
                        Left Calendar: Show Calendar Name
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={rightDisplayOptions.showCalendarName}
                          onChange={(e) => setRightDisplayOptions({...rightDisplayOptions, showCalendarName: e.target.checked})}
                          className="rounded bg-white/10 border-white/20"
                        />
                        Right: Show Calendar Name
                      </label>
                    </div>
                  </div>
                </div>

                {/* Appointment Type Colors */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Appointment Type Colors</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(appointmentTypeColors).filter(([key]) => key !== 'default').map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setAppointmentTypeColors({...appointmentTypeColors, [type]: e.target.value})}
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                        <span className="text-xs text-gray-300 capitalize">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calendar Legend */}
              {savedCalendars.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400">palette</span>
                    Calendar Legend
                  </h4>
                  <div className="space-y-1.5">
                    {savedCalendars.filter(c => c.enabled).map((cal, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color }} />
                        <span className="text-sm text-gray-300">{cal.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Client Selection Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowClientModal(false)}>
          <div className="bg-[#1a1d24] border border-white/10 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Attach Client to Appointment</h3>
              <button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search clients by name..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loadingClients ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-8 h-8 rounded-full border-2 border-gray-600 border-t-blue-500"></div>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    No clients found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => attachClientToEvent(client)}
                        className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors border border-transparent hover:border-white/10"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">
                              {client.last_name}, {client.first_name}
                            </div>
                            {client.preferred_name && (
                              <div className="text-xs text-gray-500">({client.preferred_name})</div>
                            )}
                          </div>
                          {client.dob && (
                            <div className="text-xs text-gray-400">
                              {new Date(client.dob).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {(client.phone || client.email) && (
                          <div className="mt-1 text-xs text-gray-400">
                            {client.phone && <span className="mr-2">{client.phone}</span>}
                            {client.email}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowClientModal(false)}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
