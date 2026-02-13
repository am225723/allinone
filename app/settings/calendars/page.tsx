'use client';

import { useState, useEffect, useRef } from 'react';
import BackButton from '@/components/BackButton';

type CalendarEntry = {
  url: string;
  name: string;
  color: string;
  enabled: boolean;
};

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function CalendarSettingsPage() {
  const [calendars, setCalendars] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalUrl, setNewCalUrl] = useState('');
  const [newCalColor, setNewCalColor] = useState(PRESET_COLORS[0]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadCalendars();
  }, []);

  async function loadCalendars() {
    try {
      const res = await fetch('/api/calendar/urls');
      const data = await res.json();
      if (data.ok) {
        setCalendars(data.calendars || []);
      }
    } catch (e) {
      console.error('Error loading calendars:', e);
    } finally {
      setLoading(false);
    }
  }

  async function persistCalendars(updated: CalendarEntry[]) {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/calendar/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendars: updated }),
      });
      const data = await res.json();
      if (data.ok) {
        setCalendars(updated);
        setSaveMsg('Saved');
        setTimeout(() => setSaveMsg(''), 2000);
      } else {
        setSaveMsg('Failed to save');
      }
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function addCalendar() {
    if (!newCalUrl.trim()) return;
    const entry: CalendarEntry = {
      url: newCalUrl.trim(),
      name: newCalName.trim() || `Calendar ${calendars.length + 1}`,
      color: newCalColor,
      enabled: true,
    };
    const updated = [...calendars, entry];
    persistCalendars(updated);
    setNewCalName('');
    setNewCalUrl('');
    setNewCalColor(PRESET_COLORS[(updated.length) % PRESET_COLORS.length]);
    setShowAdd(false);
  }

  function removeCalendar(idx: number) {
    persistCalendars(calendars.filter((_, i) => i !== idx));
  }

  function toggleCalendar(idx: number) {
    const updated = [...calendars];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    persistCalendars(updated);
  }

  function updateCalendar(idx: number, changes: Partial<CalendarEntry>) {
    const updated = [...calendars];
    updated[idx] = { ...updated[idx], ...changes };
    persistCalendars(updated);
  }

  function moveCalendar(idx: number, direction: 'up' | 'down') {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === calendars.length - 1) return;
    const updated = [...calendars];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    persistCalendars(updated);
  }

  async function importICSFile(file: File) {
    setImporting(true);
    setImportError('');
    try {
      const text = await file.text();
      if (!text.includes('BEGIN:VCALENDAR')) {
        setImportError('Invalid ICS file format');
        return;
      }
      const nameMatch = text.match(/X-WR-CALNAME:(.*)/);
      const calName = nameMatch ? nameMatch[1].trim() : file.name.replace('.ics', '');

      const entry: CalendarEntry = {
        url: `local:${file.name}`,
        name: calName,
        color: PRESET_COLORS[calendars.length % PRESET_COLORS.length],
        enabled: true,
      };
      persistCalendars([...calendars, entry]);
    } catch {
      setImportError('Failed to read ICS file');
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="container py-6 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <BackButton href="/settings" label="Back to Settings" />
        </div>
        <div className="card p-8 text-center">
          <span className="material-symbols-outlined text-4xl animate-spin text-gray-400">progress_activity</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/settings" label="Back to Settings" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar Settings</h1>
          <p className="text-muted mt-1">Connect and manage your iCal calendars</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-base">{showAdd ? 'close' : 'add'}</span>
          {showAdd ? 'Cancel' : 'Add Calendar'}
        </button>
      </div>

      {saveMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${saveMsg === 'Saved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {saveMsg}
        </div>
      )}

      {showAdd && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">add_circle</span>
            Connect New Calendar
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Calendar Name</label>
              <input
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                placeholder="e.g. Work Calendar, Personal, Headway"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">iCal URL</label>
              <input
                value={newCalUrl}
                onChange={(e) => setNewCalUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/...basic.ics"
                className="input w-full"
              />
              <p className="text-[10px] text-gray-500 mt-1">Paste the iCal URL from your calendar provider (Google Calendar, Outlook, Apple Calendar, etc.)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Color</label>
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
            <div className="flex gap-3 pt-1">
              <button
                onClick={addCalendar}
                disabled={!newCalUrl.trim() || saving}
                className="btn btn-primary flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">check</span>
                Add Calendar
              </button>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importICSFile(f);
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">upload_file</span>
                  {importing ? 'Importing...' : 'Upload .ics File'}
                </button>
              </div>
            </div>
            {importError && (
              <div className="p-2 bg-red-500/10 text-red-400 rounded text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {importError}
              </div>
            )}
          </div>
        </div>
      )}

      {calendars.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">calendar_month</span>
          <h3 className="text-lg font-semibold mb-1">No calendars connected</h3>
          <p className="text-muted text-sm mb-4">Add your calendar URLs to see appointments on the dashboard</p>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-2 mx-auto">
            <span className="material-symbols-outlined text-base">add</span>
            Add Your First Calendar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {calendars.map((cal, idx) => (
            <div key={idx} className="card overflow-hidden">
              <div className="p-4 flex items-center gap-4 group">
                <div className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-white/10" style={{ backgroundColor: cal.color }} />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{cal.name}</h4>
                  <p className="text-xs text-gray-500 truncate">{cal.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveCalendar(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-white/5 text-gray-500 hover:text-white transition disabled:opacity-20"
                    >
                      <span className="material-symbols-outlined text-xs">keyboard_arrow_up</span>
                    </button>
                    <button
                      onClick={() => moveCalendar(idx, 'down')}
                      disabled={idx === calendars.length - 1}
                      className="p-0.5 rounded hover:bg-white/5 text-gray-500 hover:text-white transition disabled:opacity-20"
                    >
                      <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
                    </button>
                  </div>
                  <button
                    onClick={() => toggleCalendar(idx)}
                    className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${cal.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${cal.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button
                    onClick={() => removeCalendar(idx)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>

              {editingIdx === idx && (
                <div className="border-t border-white/5 p-4 space-y-3 bg-white/[0.01]">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Display Name</label>
                    <input
                      value={cal.name}
                      onChange={(e) => {
                        const updated = [...calendars];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setCalendars(updated);
                      }}
                      onBlur={() => updateCalendar(idx, { name: cal.name })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">iCal URL</label>
                    <input
                      value={cal.url}
                      onChange={(e) => {
                        const updated = [...calendars];
                        updated[idx] = { ...updated[idx], url: e.target.value };
                        setCalendars(updated);
                      }}
                      onBlur={() => updateCalendar(idx, { url: cal.url })}
                      className="input w-full font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Color</label>
                    <div className="flex gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateCalendar(idx, { color: c })}
                          className={`w-7 h-7 rounded-full transition-all ${cal.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d24] scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="pt-3 border-t border-white/5">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{calendars.filter(c => c.enabled).length} of {calendars.length} calendars active</span>
              <a href="/patients" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition">
                <span className="material-symbols-outlined text-base">open_in_new</span>
                View Calendar
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="card mt-6 p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400">help</span>
          How to Get Your Calendar URL
        </h3>
        <div className="space-y-3 text-sm text-gray-400">
          <div>
            <p className="font-medium text-gray-300 mb-1">Google Calendar</p>
            <p>Settings &gt; Calendar &gt; Integrate calendar &gt; Copy "Secret address in iCal format"</p>
          </div>
          <div>
            <p className="font-medium text-gray-300 mb-1">Outlook / Microsoft 365</p>
            <p>Settings &gt; Calendar &gt; Shared calendars &gt; Publish a calendar &gt; Copy ICS link</p>
          </div>
          <div>
            <p className="font-medium text-gray-300 mb-1">Apple Calendar (iCloud)</p>
            <p>Right-click calendar &gt; Share Settings &gt; Public Calendar &gt; Copy URL</p>
          </div>
          <div>
            <p className="font-medium text-gray-300 mb-1">Headway / Other EHR</p>
            <p>Look for Calendar Integration or iCal export in your provider settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
