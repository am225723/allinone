'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    timezone: 'America/New_York',
    sentimentReport: '',
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
            sentimentReport: data.profile.sentimentReport || '',
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setProfile(prev => ({ ...prev, sentimentReport: text }));
    } catch (err) {
      console.error('Error reading file:', err);
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

      <div className="max-w-2xl space-y-6">
        <div className="card p-6">
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-white/10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[3px]">
              <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center text-2xl font-bold">
                {profile.name.charAt(0) || 'U'}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile.name || 'User'}</h2>
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
        </div>

        <div className="card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">psychology</span>
              Sentiment & Style Report
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Paste or upload a report describing how you communicate. The AI will use this to match your voice and tone when drafting emails and messages.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              value={profile.sentimentReport}
              onChange={(e) => setProfile({ ...profile, sentimentReport: e.target.value })}
              placeholder="Example: I tend to be warm but professional. I use the patient's first name. I avoid overly clinical language. I prefer short, clear sentences. I always include a sign-off like 'Best regards' or 'Take care'..."
              className="input w-full min-h-[200px] resize-y"
              rows={8}
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 cursor-pointer transition">
                <span className="material-symbols-outlined text-base">upload_file</span>
                Upload .txt file
                <input
                  type="file"
                  accept=".txt,.md,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-gray-500">
                {profile.sentimentReport.length > 0
                  ? `${profile.sentimentReport.length} characters`
                  : 'No report added yet'}
              </span>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-xs text-purple-300">
                <span className="font-medium">How this works:</span> The AI reads this report before generating any draft emails or SMS replies to match your communication style. Include details like tone, preferred greetings, sign-offs, level of formality, and any phrases you commonly use.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
  );
}
