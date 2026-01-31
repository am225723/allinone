'use client';

import { useState } from 'react';
import BackButton from '@/components/BackButton';

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    urgentAlerts: true,
    dailySummary: true,
    weeklyDigest: false,
    newMessageSound: true
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-gray-600'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="container py-6">
      <div className="flex items-center gap-4 mb-6">
        <BackButton href="/settings" label="Back to Settings" />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted mt-1">Configure how you receive notifications</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Notification Channels</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium">Email Notifications</h3>
                <p className="text-sm text-muted">Receive notifications via email</p>
              </div>
              <Toggle enabled={settings.emailNotifications} onToggle={() => handleToggle('emailNotifications')} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium">Push Notifications</h3>
                <p className="text-sm text-muted">Browser and mobile push notifications</p>
              </div>
              <Toggle enabled={settings.pushNotifications} onToggle={() => handleToggle('pushNotifications')} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium">SMS Notifications</h3>
                <p className="text-sm text-muted">Receive text message alerts</p>
              </div>
              <Toggle enabled={settings.smsNotifications} onToggle={() => handleToggle('smsNotifications')} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Notification Types</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium">Urgent Alerts</h3>
                <p className="text-sm text-muted">High-priority message notifications</p>
              </div>
              <Toggle enabled={settings.urgentAlerts} onToggle={() => handleToggle('urgentAlerts')} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium">Daily Summary</h3>
                <p className="text-sm text-muted">Receive a daily activity digest</p>
              </div>
              <Toggle enabled={settings.dailySummary} onToggle={() => handleToggle('dailySummary')} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <h3 className="font-medium">Weekly Digest</h3>
                <p className="text-sm text-muted">Weekly performance summary</p>
              </div>
              <Toggle enabled={settings.weeklyDigest} onToggle={() => handleToggle('weeklyDigest')} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Sound & Alerts</h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <h3 className="font-medium">New Message Sound</h3>
              <p className="text-sm text-muted">Play sound for new messages</p>
            </div>
            <Toggle enabled={settings.newMessageSound} onToggle={() => handleToggle('newMessageSound')} />
          </div>
        </div>

        <button onClick={handleSave} className="btn btn-primary">
          Save Preferences
        </button>
      </div>
    </div>
  );
}
