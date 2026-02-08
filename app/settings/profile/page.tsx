'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    timezone: 'America/New_York'
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/settings/profile');
        const data = await res.json();
        if (data.ok && data.profile) {
          setProfile({
            name: data.profile.name || '',
            email: data.profile.email || '',
            phone: data.profile.phone || '',
            timezone: data.profile.timezone || 'America/New_York',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.ok) {
        setSaveMessage('Profile saved successfully');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/settings" label="Back to Settings" />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted mt-1">Manage your personal information</p>
      </div>

      <div className="max-w-2xl">
        <div className="card p-6">
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-white/10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[3px]">
              <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center text-2xl font-bold">
                {profile.name.charAt(0)}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.name}</h2>
              <p className="text-muted">{profile.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="input w-full"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className="input w-full"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-4">
            <button onClick={handleSave} disabled={saving || loading} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                {saveMessage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
