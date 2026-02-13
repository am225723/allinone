'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  revenue: number;
  color: string;
  platform: string;
  active: boolean;
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function AppointmentTypesPage() {
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<Omit<AppointmentType, 'id'>>({
    name: '',
    duration: 30,
    revenue: 0,
    color: PRESET_COLORS[0],
    platform: 'Office',
    active: true,
  });

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    try {
      const res = await fetch('/api/settings/appointment-types');
      const data = await res.json();
      if (data.ok) setTypes(data.types || []);
    } catch (e) {
      console.error('Error loading types:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveTypes(updated: AppointmentType[]) {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/settings/appointment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ types: updated }),
      });
      const data = await res.json();
      if (data.ok) {
        setTypes(updated);
        setSaveMessage('Saved');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch (e) {
      console.error('Error saving types:', e);
      setSaveMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function addType() {
    if (!newType.name.trim()) return;
    const entry: AppointmentType = {
      ...newType,
      id: Date.now().toString(36),
    };
    const updated = [...types, entry];
    saveTypes(updated);
    setNewType({ name: '', duration: 30, revenue: 0, color: PRESET_COLORS[(types.length + 1) % PRESET_COLORS.length], platform: 'Office', active: true });
    setShowAdd(false);
  }

  function removeType(id: string) {
    saveTypes(types.filter(t => t.id !== id));
  }

  function toggleType(id: string) {
    saveTypes(types.map(t => t.id === id ? { ...t, active: !t.active } : t));
  }

  if (loading) {
    return (
      <div className="container py-6">
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
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/settings" label="Back to Settings" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Appointment Types</h1>
          <p className="text-muted mt-1">Manage appointment types and link them to revenue tracking</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-base">{showAdd ? 'close' : 'add'}</span>
          {showAdd ? 'Cancel' : 'Add Type'}
        </button>
      </div>

      {saveMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${saveMessage === 'Saved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {saveMessage}
        </div>
      )}

      {showAdd && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">add_circle</span>
            New Appointment Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
              <input
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="e.g. Office Follow-Up"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Platform / Location</label>
              <select
                value={newType.platform}
                onChange={(e) => setNewType({ ...newType, platform: e.target.value })}
                className="input w-full"
              >
                <option value="Office">Office (In-Person)</option>
                <option value="Telehealth">Telehealth (Virtual)</option>
                <option value="Headway">Headway Virtual</option>
                <option value="Phone">Phone Call</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={newType.duration}
                onChange={(e) => setNewType({ ...newType, duration: parseInt(e.target.value) || 0 })}
                className="input w-full"
                min={5}
                step={5}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Revenue ($)</label>
              <input
                type="number"
                value={newType.revenue}
                onChange={(e) => setNewType({ ...newType, revenue: parseFloat(e.target.value) || 0 })}
                className="input w-full"
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Color</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewType({ ...newType, color: c })}
                    className={`w-7 h-7 rounded-full transition-all ${newType.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d24] scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={addType}
              disabled={!newType.name.trim() || saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">check</span>
              Add Appointment Type
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl">
        {types.length === 0 ? (
          <div className="card p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">event_note</span>
            <h3 className="text-lg font-semibold mb-1">No appointment types yet</h3>
            <p className="text-muted text-sm mb-4">Add your appointment types to track revenue and link to calendar events</p>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary">
              <span className="material-symbols-outlined text-base">add</span>
              Add First Type
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {types.map((t) => (
              <div key={t.id} className={`card p-4 flex items-center gap-4 group transition-opacity ${!t.active ? 'opacity-50' : ''}`}>
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{t.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400">{t.platform}</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {t.duration} min
                    {t.revenue > 0 && <span className="ml-2 text-emerald-400">${t.revenue.toFixed(2)}</span>}
                  </p>
                </div>
                <button
                  onClick={() => toggleType(t.id)}
                  className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${t.active ? 'bg-emerald-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${t.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <button
                  onClick={() => removeType(t.id)}
                  className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}

            <div className="pt-4 border-t border-white/5 mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total active types: {types.filter(t => t.active).length}</span>
                {types.some(t => t.revenue > 0) && (
                  <span className="text-gray-400">
                    Revenue range: ${Math.min(...types.filter(t => t.active && t.revenue > 0).map(t => t.revenue)).toFixed(0)} - ${Math.max(...types.filter(t => t.active).map(t => t.revenue)).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
