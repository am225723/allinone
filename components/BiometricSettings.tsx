'use client';

import { useState, useEffect } from 'react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';

interface Credential {
  id: string;
  device_type: string;
  created_at: string;
}

export default function BiometricSettings() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/auth/webauthn/credentials');
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch {
      setError('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    setError('');
    setSuccess('');

    try {
      const optionsRes = await fetch('/api/auth/webauthn/register');
      const options = await optionsRes.json();

      if (optionsRes.status !== 200) {
        throw new Error(options.error || 'Failed to get registration options');
      }

      const { sessionId, ...optionsJSON } = options;
      const credential = await startRegistration({ optionsJSON });

      const verifyRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: credential,
          deviceName: getDeviceName(),
          sessionId,
        }),
      });

      const result = await verifyRes.json();

      if (result.success) {
        setSuccess('Device registered successfully');
        await fetchCredentials();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to register device');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Registration was cancelled');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to register device');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this device? You won\'t be able to use biometrics from it anymore.')) {
      return;
    }

    setDeleting(id);
    setError('');

    try {
      const res = await fetch(`/api/auth/webauthn/credentials?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setCredentials(prev => prev.filter(c => c.id !== id));
        setSuccess('Device removed');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to remove device');
      }
    } catch {
      setError('Failed to remove device');
    } finally {
      setDeleting(null);
    }
  };

  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Android/.test(ua)) return 'Android Device';
    return 'Unknown Device';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!supported) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-[var(--text-muted)]">fingerprint</span>
          <h3 className="font-semibold text-[var(--text)]">Biometric Login</h3>
        </div>
        <p className="text-[var(--text-muted)] text-sm">
          Biometric authentication is not supported on this browser. Try using Safari on iOS/macOS or Chrome on Android/Windows.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-orange-500">fingerprint</span>
          <div>
            <h3 className="font-semibold text-[var(--text)]">Biometric Login</h3>
            <p className="text-sm text-[var(--text-muted)]">Use Face ID, Touch ID, or Windows Hello</p>
          </div>
        </div>
        <button
          onClick={handleEnroll}
          disabled={enrolling}
          className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {enrolling ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              Adding...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">add</span>
              Add Device
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-2xl text-[var(--text-muted)]">progress_activity</span>
        </div>
      ) : credentials.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)]">
          <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">devices</span>
          <p className="text-sm">No devices registered yet</p>
          <p className="text-xs mt-1">Add a device to enable quick biometric login</p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-darker)] border border-[var(--border)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--text-muted)]">
                    {(cred.device_type || '').includes('iPhone') || (cred.device_type || '').includes('iPad')
                      ? 'phone_iphone'
                      : (cred.device_type || '').includes('Mac')
                      ? 'laptop_mac'
                      : (cred.device_type || '').includes('Windows')
                      ? 'computer'
                      : (cred.device_type || '').includes('Android')
                      ? 'phone_android'
                      : 'devices'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-[var(--text)]">{cred.device_type || 'Unknown Device'}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Added {formatDate(cred.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(cred.id)}
                disabled={deleting === cred.id}
                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                title="Remove device"
              >
                {deleting === cred.id ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">delete</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
