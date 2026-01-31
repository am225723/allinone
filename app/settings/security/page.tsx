'use client';

import { useState } from 'react';
import BackButton from '@/components/BackButton';

export default function SecuritySettingsPage() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePin = async () => {
    if (newPin.length !== 4) {
      setMessage({ type: 'error', text: 'PIN must be exactly 4 digits' });
      return;
    }
    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'PINs do not match' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin })
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'PIN updated successfully' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update PIN' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
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
        <h1 className="text-2xl font-bold">Security Settings</h1>
        <p className="text-muted mt-1">Manage your account security</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">pin</span>
            Change PIN
          </h2>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Current PIN</label>
              <input
                type="password"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input w-full"
                placeholder="Enter current 4-digit PIN"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">New PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input w-full"
                placeholder="Enter new 4-digit PIN"
                maxLength={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm New PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input w-full"
                placeholder="Confirm new 4-digit PIN"
                maxLength={4}
              />
            </div>
            <button onClick={handleChangePin} disabled={saving} className="btn btn-primary">
              {saving ? 'Updating...' : 'Update PIN'}
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">devices</span>
            Active Sessions
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-400">computer</span>
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted">This device</p>
                </div>
              </div>
              <span className="text-xs text-green-400">Active now</span>
            </div>
          </div>
        </div>

        <div className="card p-6 border-red-500/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
            <span className="material-symbols-outlined">warning</span>
            Danger Zone
          </h2>
          <p className="text-sm text-muted mb-4">
            These actions are permanent and cannot be undone.
          </p>
          <button className="btn btn-secondary text-red-400 border-red-500/30">
            Log Out All Devices
          </button>
        </div>
      </div>
    </div>
  );
}
