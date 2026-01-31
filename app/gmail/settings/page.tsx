'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

export default function GmailSettingsPage() {
  const [settings, setSettings] = useState({
    lookbackDays: 14,
    autoTriage: false,
    skipSenders: '',
    skipSubjects: '',
    triageInterval: 4
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/gmail/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/gmail" label="Back to Gmail" />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gmail Settings</h1>
        <p className="text-muted mt-1">Configure your Gmail integration</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">schedule</span>
            Triage Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Default Lookback Period (days)</label>
              <input
                type="number"
                value={settings.lookbackDays}
                onChange={(e) => setSettings({ ...settings, lookbackDays: parseInt(e.target.value) })}
                className="input w-32"
                min="1"
                max="90"
              />
              <p className="text-xs text-muted mt-1">How many days back to scan for emails</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Auto-Triage Interval (hours)</label>
              <select
                value={settings.triageInterval}
                onChange={(e) => setSettings({ ...settings, triageInterval: parseInt(e.target.value) })}
                className="input w-full"
              >
                <option value="1">Every hour</option>
                <option value="2">Every 2 hours</option>
                <option value="4">Every 4 hours</option>
                <option value="6">Every 6 hours</option>
                <option value="12">Every 12 hours</option>
                <option value="24">Once daily</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Auto-Triage</label>
                <p className="text-sm text-muted">Automatically run triage on schedule</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoTriage: !settings.autoTriage })}
                className={`w-12 h-6 rounded-full transition-colors ${settings.autoTriage ? 'bg-primary' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.autoTriage ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">filter_alt</span>
            Skip Rules
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Skip Senders</label>
              <textarea
                value={settings.skipSenders}
                onChange={(e) => setSettings({ ...settings, skipSenders: e.target.value })}
                className="input w-full h-24"
                placeholder="Enter email addresses to skip, one per line"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Skip Subject Keywords</label>
              <textarea
                value={settings.skipSubjects}
                onChange={(e) => setSettings({ ...settings, skipSubjects: e.target.value })}
                className="input w-full h-24"
                placeholder="Enter subject keywords to skip, one per line"
              />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
