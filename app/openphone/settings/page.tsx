'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

export default function QuoSettingsPage() {
  const [settings, setSettings] = useState({
    autoReply: false,
    maxConversations: 25,
    blockedPhones: '',
    blockedPhrases: '',
    customSignature: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/openphone/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/openphone/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/openphone" label="Back to Quo" />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Quo Settings</h1>
        <p className="text-muted mt-1">Configure your Quo integration</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">key</span>
            API Configuration
          </h2>
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="material-symbols-outlined text-green-400">check_circle</span>
            <div>
              <p className="font-medium text-green-400">API Key Configured</p>
              <p className="text-sm text-muted">Your Quo API key is securely stored in environment variables</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">tune</span>
            Processing Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium">Auto-Reply</label>
                <p className="text-sm text-muted">Automatically send AI-generated replies</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoReply: !settings.autoReply })}
                className={`w-12 h-6 rounded-full transition-colors ${settings.autoReply ? 'bg-primary' : 'bg-gray-600'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.autoReply ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Conversations Per Run</label>
              <input
                type="number"
                value={settings.maxConversations}
                onChange={(e) => setSettings({ ...settings, maxConversations: parseInt(e.target.value) })}
                className="input w-32"
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">block</span>
            Blocklist
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Blocked Phone Numbers</label>
              <textarea
                value={settings.blockedPhones}
                onChange={(e) => setSettings({ ...settings, blockedPhones: e.target.value })}
                className="input w-full h-24"
                placeholder="Enter phone numbers, one per line"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Blocked Phrases</label>
              <textarea
                value={settings.blockedPhrases}
                onChange={(e) => setSettings({ ...settings, blockedPhrases: e.target.value })}
                className="input w-full h-24"
                placeholder="Enter phrases to block, one per line"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">signature</span>
            Signature
          </h2>
          <div>
            <label className="block text-sm font-medium mb-2">Custom Signature</label>
            <textarea
              value={settings.customSignature}
              onChange={(e) => setSettings({ ...settings, customSignature: e.target.value })}
              className="input w-full h-32"
              placeholder="Enter your custom signature (HTML supported)"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Save Settings
              </>
            )}
          </button>
          {saved && (
            <span className="text-green-400 flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              Settings saved successfully
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
