'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface Location {
  id: string;
  name: string;
  address: string;
  type: string;
  active: boolean;
}

const LOCATION_TYPES = ['Office', 'Telehealth', 'Hospital', 'Clinic', 'Home Visit', 'Other'];

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newLocation, setNewLocation] = useState<Omit<Location, 'id'>>({
    name: '',
    address: '',
    type: 'Office',
    active: true,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      const res = await fetch('/api/settings/locations');
      const data = await res.json();
      if (data.ok) setLocations(data.locations || []);
    } catch (e) {
      console.error('Error loading locations:', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveLocations(updated: Location[]) {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/settings/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: updated }),
      });
      const data = await res.json();
      if (data.ok) {
        setLocations(updated);
        setSaveMessage('Saved');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch (e) {
      console.error('Error saving locations:', e);
      setSaveMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function addLocation() {
    if (!newLocation.name.trim()) return;
    const entry: Location = {
      ...newLocation,
      id: Date.now().toString(36),
    };
    const updated = [...locations, entry];
    saveLocations(updated);
    setNewLocation({ name: '', address: '', type: 'Office', active: true });
    setShowAdd(false);
  }

  function removeLocation(id: string) {
    saveLocations(locations.filter(l => l.id !== id));
  }

  function toggleLocation(id: string) {
    saveLocations(locations.map(l => l.id === id ? { ...l, active: !l.active } : l));
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
          <h1 className="text-2xl font-bold">Locations</h1>
          <p className="text-muted mt-1">Manage practice locations for appointments</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-base">{showAdd ? 'close' : 'add'}</span>
          {showAdd ? 'Cancel' : 'Add Location'}
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
            New Location
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
              <input
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="e.g. Main Office"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
              <select
                value={newLocation.type}
                onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value })}
                className="input w-full"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Address</label>
              <input
                value={newLocation.address}
                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                placeholder="e.g. 45 S Main St, Suite 111, West Hartford, CT 06107"
                className="input w-full"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={addLocation}
              disabled={!newLocation.name.trim() || saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">check</span>
              Add Location
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl">
        {locations.length === 0 ? (
          <div className="card p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">location_on</span>
            <h3 className="text-lg font-semibold mb-1">No locations yet</h3>
            <p className="text-muted text-sm mb-4">Add your practice locations to use as dropdown options in appointments</p>
            <button onClick={() => setShowAdd(true)} className="btn btn-primary">
              <span className="material-symbols-outlined text-base">add</span>
              Add First Location
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {locations.map((l) => (
              <div key={l.id} className={`card p-4 flex items-center gap-4 group transition-opacity ${!l.active ? 'opacity-50' : ''}`}>
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-blue-400">
                    {l.type === 'Telehealth' ? 'videocam' : l.type === 'Hospital' ? 'local_hospital' : l.type === 'Home Visit' ? 'home' : 'location_on'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{l.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400">{l.type}</span>
                  </div>
                  {l.address && <p className="text-sm text-gray-400 truncate">{l.address}</p>}
                </div>
                <button
                  onClick={() => toggleLocation(l.id)}
                  className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${l.active ? 'bg-emerald-500' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${l.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <button
                  onClick={() => removeLocation(l.id)}
                  className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}

            <div className="pt-4 border-t border-white/5 mt-4">
              <div className="text-sm text-gray-400">
                Total active locations: {locations.filter(l => l.active).length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
